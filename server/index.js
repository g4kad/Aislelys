import express from "express";
import cors from "cors";
import crypto from "crypto";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { v4 as uuid } from "uuid";
import { readData, writeData } from "./store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.join(__dirname, "../client/dist");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const SESSION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const NOTIFICATION_BUFFER_MS = 10 * 60 * 1000; // 10 minutes

// ---------- Auth helpers ----------

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  return Object.fromEntries(
    header.split(";").map((p) => {
      const idx = p.indexOf("=");
      return [p.slice(0, idx).trim(), decodeURIComponent(p.slice(idx + 1))];
    })
  );
}

function hashPassword(password, saltHex) {
  const salt = saltHex ? Buffer.from(saltHex, "hex") : crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
  return { hash: hash.toString("hex"), salt: salt.toString("hex") };
}

function randomToken() {
  return crypto.randomBytes(32).toString("hex");
}

const CURRENCIES = ["SGD", "MYR", "THB", "PHP", "USD", "EUR", "GBP", "JPY", "CNY", "KRW"];
function validCurrency(currency) {
  return CURRENCIES.includes(currency) ? currency : "SGD";
}

function sanitizeExtras(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((e) => e && typeof e === "object")
    .map((e) => ({
      id: typeof e.id === "string" && e.id ? e.id : crypto.randomUUID(),
      label: typeof e.label === "string" ? e.label : "",
      amount: Math.max(0, Number(e.amount) || 0),
    }));
}

// Short, unambiguous alphabet (no 0/O/1/l/i) for shareable IDs like guest
// invite links, so they're easy to read aloud/retype and short to send.
const SHORT_ID_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

function generateShortId(length = 7) {
  let id = "";
  for (let i = 0; i < length; i++) {
    id += SHORT_ID_ALPHABET[Math.floor(Math.random() * SHORT_ID_ALPHABET.length)];
  }
  return id;
}

function generateUniqueGuestOwnerId(guestOwners) {
  const existing = new Set(guestOwners.map((o) => o.id));
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateShortId();
    if (!existing.has(candidate)) return candidate;
  }
  return uuid();
}

async function createSession(res, data, userId) {
  const token = randomToken();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_MAX_AGE_MS);
  data.sessions.push({ token, userId, createdAt: now.toISOString(), expiresAt: expires.toISOString() });
  await writeData(data);
  res.setHeader(
    "Set-Cookie",
    `session=${token}; HttpOnly; Path=/; Max-Age=${Math.floor(SESSION_MAX_AGE_MS / 1000)}; SameSite=Lax`
  );
}

function isPublicGuestInvitePath(reqPath, method) {
  const ownerMatch = reqPath.match(/^\/api\/guest-owners\/[^/]+$/);
  if (ownerMatch && method === "GET") return true;
  const guestsMatch = reqPath.match(/^\/api\/guest-owners\/[^/]+\/guests(\/[^/]+)?$/);
  if (guestsMatch && (method === "POST" || method === "PUT" || method === "DELETE")) return true;
  const categoriesMatch = reqPath.match(/^\/api\/guest-owners\/[^/]+\/categories$/);
  if (categoriesMatch && method === "POST") return true;
  return false;
}

function isPublicCouplePath(reqPath, method) {
  if (/^\/api\/couples\/[^/]+\/auth-status$/.test(reqPath) && method === "GET") return true;
  if (/^\/api\/couples\/[^/]+\/login$/.test(reqPath) && method === "POST") return true;
  return false;
}

// Local-dev-only shortcut (never enabled in production) so you can open a
// single link on another device and land logged in, skipping the password
// form — handy for testing on a phone over the LAN.
function isDevLoginPath(reqPath, method) {
  return process.env.NODE_ENV !== "production" && method === "GET" && /^\/api\/dev-login\/[^/]+$/.test(reqPath);
}

const PUBLIC_AUTH_PATHS = new Set(["/api/auth/logout", "/api/signup", "/api/default-couple"]);

app.use(async (req, res, next) => {
  const cookies = parseCookies(req);
  const token = cookies.session;
  if (token) {
    const data = await readData();
    const session = (data.sessions || []).find((s) => s.token === token);
    if (session && new Date(session.expiresAt) > new Date()) {
      const user = (data.users || []).find((u) => u.id === session.userId);
      if (user) {
        req.user = { id: user.id, name: user.name };
        req.coupleId = user.coupleId;
      }
    }
  }
  if (
    PUBLIC_AUTH_PATHS.has(req.path) ||
    isPublicGuestInvitePath(req.path, req.method) ||
    isPublicCouplePath(req.path, req.method) ||
    isDevLoginPath(req.path, req.method)
  ) {
    return next();
  }
  if (req.path.startsWith("/api/") && !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
});

// Notifications are inserted immediately but stamped with a scheduledFor
// timestamp NOTIFICATION_BUFFER_MS in the future; the read endpoint only
// returns rows whose scheduledFor has passed. That way a quick create-then-
// undo (e.g. adding a task, then deleting it because it was wrong) never
// surfaces at all — see cancelPendingNotifications, called from the routes
// that revert an action within the buffer window.
async function notifyOtherUsers(coupleId, actorUserId, message, entityType, entityId, kind) {
  const data = await readData();
  const couple = (data.couples || []).find((cpl) => cpl.id === coupleId);
  if (couple?.notificationsHoldUntil && new Date().toISOString().slice(0, 10) < couple.notificationsHoldUntil) return;
  const others = (data.users || []).filter((u) => u.coupleId === coupleId && u.id !== actorUserId);
  const scheduledFor = new Date(Date.now() + NOTIFICATION_BUFFER_MS).toISOString();
  for (const u of others) {
    data.notifications.push({
      id: uuid(),
      coupleId,
      userId: u.id,
      actorUserId,
      message,
      entityType,
      entityId,
      kind,
      read: false,
      createdAt: new Date().toISOString(),
      scheduledFor,
    });
  }
  await writeData(data);
}

// Deletes any not-yet-visible (scheduledFor still in the future) pending
// notifications for an entity, optionally scoped to one kind. Used when an
// action is reverted within the buffer window (task/todo deleted,
// un-completed, or reassigned again) so the stale notification never shows.
async function cancelPendingNotifications(entityId, kind) {
  const data = await readData();
  const now = new Date().toISOString();
  const before = data.notifications.length;
  data.notifications = data.notifications.filter(
    (n) => !(n.entityId === entityId && (!kind || n.kind === kind) && n.scheduledFor > now)
  );
  if (data.notifications.length !== before) await writeData(data);
}

// ---------- Signup & couple-scoped auth routes ----------

const RESERVED_SLUGS = new Set(["signup", "guests", "login", "api", "w", "assets", "terms", "privacy"]);

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateCoupleSlug(couples, partner1Name, partner2Name) {
  const base = [slugify(partner1Name), slugify(partner2Name)].filter(Boolean).join("-") || "couple";
  const existing = new Set(couples.map((c) => c.id));
  let candidate = base;
  let suffix = 2;
  while (RESERVED_SLUGS.has(candidate) || existing.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix++;
  }
  return candidate;
}

app.post("/api/signup", async (req, res) => {
  const { partner1, partner2, weddingDate } = req.body;
  if (!partner1?.name?.trim() || !partner1?.password || !partner2?.name?.trim() || !partner2?.password) {
    return res.status(400).json({ error: "A name and password are required for both partners" });
  }
  const data = await readData();
  data.couples = data.couples || [];
  const coupleId = generateCoupleSlug(data.couples, partner1.name.trim(), partner2.name.trim());
  const p1Hash = hashPassword(partner1.password);
  const p2Hash = hashPassword(partner2.password);
  const p1Id = uuid();
  const p2Id = uuid();
  const createdAt = new Date().toISOString();
  data.couples.push({
    id: coupleId,
    partner1Name: partner1.name.trim(),
    partner2Name: partner2.name.trim(),
    weddingDate: weddingDate || null,
    budgetTotal: 0,
    notificationsHoldUntil: null,
    createdAt,
  });
  data.users.push(
    { id: p1Id, coupleId, name: partner1.name.trim(), passwordHash: p1Hash.hash, passwordSalt: p1Hash.salt },
    { id: p2Id, coupleId, name: partner2.name.trim(), passwordHash: p2Hash.hash, passwordSalt: p2Hash.salt }
  );
  await createSession(res, data, p1Id);
  res.status(201).json({ coupleId, user: { id: p1Id, name: partner1.name.trim() } });
});

app.get("/api/default-couple", async (req, res) => {
  const data = await readData();
  const sorted = [...(data.couples || [])].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  if (sorted.length === 0) return res.status(404).json({ error: "No workspace found" });
  res.json({ coupleId: sorted[0].id });
});

app.get("/api/couples/:coupleId/auth-status", async (req, res) => {
  const data = await readData();
  const users = (data.users || [])
    .filter((u) => u.coupleId === req.params.coupleId)
    .map((u) => ({ id: u.id, name: u.name }));
  if (users.length === 0) return res.status(404).json({ error: "Workspace not found" });
  res.json({ users });
});

app.post("/api/couples/:coupleId/login", async (req, res) => {
  const { userId, password } = req.body;
  const data = await readData();
  const user = (data.users || []).find((u) => u.id === userId && u.coupleId === req.params.coupleId);
  if (!user) return res.status(401).json({ error: "Incorrect name or password" });
  const { hash } = hashPassword(password, user.passwordSalt);
  if (hash !== user.passwordHash) return res.status(401).json({ error: "Incorrect name or password" });
  await createSession(res, data, user.id);
  res.json({ id: user.id, name: user.name });
});

if (process.env.NODE_ENV !== "production") {
  app.get("/api/dev-login/:userId", async (req, res) => {
    const data = await readData();
    const user = (data.users || []).find((u) => u.id === req.params.userId);
    if (!user) return res.status(404).send("Unknown dev user id");
    await createSession(res, data, user.id);
    res.redirect(`/${user.coupleId}/planner`);
  });
}

app.post("/api/auth/logout", async (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies.session;
  if (token) {
    const data = await readData();
    data.sessions = (data.sessions || []).filter((s) => s.token !== token);
    await writeData(data);
  }
  res.setHeader("Set-Cookie", "session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
  res.status(204).end();
});

app.get("/api/auth/me", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  res.json(req.user);
});

// ---------- Notifications ----------

app.get("/api/notifications", async (req, res) => {
  const data = await readData();
  const now = new Date().toISOString();
  const list = (data.notifications || [])
    .filter((n) => n.userId === req.user.id && (n.scheduledFor ?? n.createdAt) <= now)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);
  res.json(list);
});

app.post("/api/notifications/:id/read", async (req, res) => {
  const data = await readData();
  const n = (data.notifications || []).find((n) => n.id === req.params.id && n.userId === req.user.id);
  if (n) n.read = true;
  await writeData(data);
  res.status(204).end();
});

app.post("/api/notifications/read-all", async (req, res) => {
  const data = await readData();
  for (const n of data.notifications || []) {
    if (n.userId === req.user.id) n.read = true;
  }
  await writeData(data);
  res.status(204).end();
});

// ---------- Wedding date (for the countdown subheader) ----------

app.get("/api/wedding-date", async (req, res) => {
  const data = await readData();
  const couple = (data.couples || []).find((c) => c.id === req.coupleId);
  res.json({ date: couple?.weddingDate ?? null });
});

// ---------- ROM date (shown on the Overview) ----------

app.get("/api/rom-date", async (req, res) => {
  const data = await readData();
  const couple = (data.couples || []).find((c) => c.id === req.coupleId);
  res.json({ date: couple?.romDate ?? null });
});

app.put("/api/rom-date", async (req, res) => {
  const { date } = req.body;
  if (date !== null && !(typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date)))) {
    return res.status(400).json({ error: "date must be YYYY-MM-DD or null" });
  }
  const data = await readData();
  const couple = (data.couples || []).find((c) => c.id === req.coupleId);
  couple.romDate = date;
  await writeData(data);
  res.json({ date });
});

// ---------- Our Big Day ----------

const BIG_DAY_MAX_DAYS = 10;
const BIG_DAY_MAX_SESSIONS = 10;

// {days, sessions: [{id, name, day}]} — names may be blank (the page shows
// "Session N"), and each session's day is clamped into 1..days.
function sanitizeBigDay(value) {
  if (!value || typeof value !== "object") return null;
  const days = Math.min(BIG_DAY_MAX_DAYS, Math.max(1, Math.floor(Number(value.days)) || 1));
  const raw = Array.isArray(value.sessions) ? value.sessions : [];
  const sessions = raw
    .filter((s) => s && typeof s === "object")
    .slice(0, BIG_DAY_MAX_SESSIONS)
    .map((s) => ({
      id: typeof s.id === "string" && s.id ? s.id : crypto.randomUUID(),
      name: typeof s.name === "string" ? s.name.trim().slice(0, 60) : "",
      day: Math.min(days, Math.max(1, Math.floor(Number(s.day)) || 1)),
      tasks: Array.isArray(s.tasks) ? s.tasks.map((t) => sanitizeBigDayTask(t)).filter(Boolean) : [],
    }));
  if (sessions.length === 0) return null;
  return { days, sessions };
}

const BIG_DAY_PRIORITIES = ["low", "medium", "high"];

// One task on a session's timeline. Time is optional ("" = not set).
function sanitizeBigDayTask(value, id) {
  if (!value || typeof value !== "object") return null;
  const name = typeof value.name === "string" ? value.name.trim().slice(0, 120) : "";
  if (!name) return null;
  return {
    id: id || (typeof value.id === "string" && value.id ? value.id : crypto.randomUUID()),
    name,
    time: typeof value.time === "string" && /^\d{2}:\d{2}$/.test(value.time) ? value.time : "",
    priority: BIG_DAY_PRIORITIES.includes(value.priority) ? value.priority : "medium",
    notes: typeof value.notes === "string" ? value.notes.trim().slice(0, 2000) : "",
  };
}

// The setup form only changes days and sessions — keep each session's tasks
// from what's stored, so saving the setup can't wipe tasks added meanwhile.
function keepStoredTasks(next, stored) {
  const tasksBySession = new Map((stored?.sessions || []).map((s) => [s.id, s.tasks || []]));
  return { ...next, sessions: next.sessions.map((s) => ({ ...s, tasks: tasksBySession.get(s.id) || [] })) };
}

function findBigDayTask(bigDay, taskId) {
  for (const session of bigDay?.sessions || []) {
    const index = session.tasks.findIndex((t) => t.id === taskId);
    if (index !== -1) return { session, index };
  }
  return null;
}

app.get("/api/big-day", async (req, res) => {
  const data = await readData();
  const couple = (data.couples || []).find((c) => c.id === req.coupleId);
  res.json({ bigDay: couple?.bigDay ? sanitizeBigDay(couple.bigDay) : null });
});

app.put("/api/big-day", async (req, res) => {
  const next = sanitizeBigDay(req.body);
  if (!next) return res.status(400).json({ error: "at least one session is required" });
  const data = await readData();
  const couple = (data.couples || []).find((c) => c.id === req.coupleId);
  couple.bigDay = keepStoredTasks(next, couple.bigDay ? sanitizeBigDay(couple.bigDay) : null);
  await writeData(data);
  res.json({ bigDay: couple.bigDay });
});

// Reset: clears the days, sessions and every task — back to the first-time setup.
app.delete("/api/big-day", async (req, res) => {
  const data = await readData();
  const couple = (data.couples || []).find((c) => c.id === req.coupleId);
  if (couple) delete couple.bigDay;
  await writeData(data);
  res.json({ bigDay: null });
});

app.post("/api/big-day/sessions/:sessionId/tasks", async (req, res) => {
  const data = await readData();
  const couple = (data.couples || []).find((c) => c.id === req.coupleId);
  const bigDay = couple?.bigDay ? sanitizeBigDay(couple.bigDay) : null;
  const session = bigDay?.sessions.find((s) => s.id === req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });
  const task = sanitizeBigDayTask(req.body, uuid());
  if (!task) return res.status(400).json({ error: "name is required" });
  session.tasks.push(task);
  couple.bigDay = bigDay;
  await writeData(data);
  res.status(201).json({ bigDay });
});

app.put("/api/big-day/tasks/:taskId", async (req, res) => {
  const data = await readData();
  const couple = (data.couples || []).find((c) => c.id === req.coupleId);
  const bigDay = couple?.bigDay ? sanitizeBigDay(couple.bigDay) : null;
  const found = findBigDayTask(bigDay, req.params.taskId);
  if (!found) return res.status(404).json({ error: "Task not found" });
  const task = sanitizeBigDayTask(req.body, req.params.taskId);
  if (!task) return res.status(400).json({ error: "name is required" });
  found.session.tasks[found.index] = task;
  couple.bigDay = bigDay;
  await writeData(data);
  res.json({ bigDay });
});

app.delete("/api/big-day/tasks/:taskId", async (req, res) => {
  const data = await readData();
  const couple = (data.couples || []).find((c) => c.id === req.coupleId);
  const bigDay = couple?.bigDay ? sanitizeBigDay(couple.bigDay) : null;
  const found = findBigDayTask(bigDay, req.params.taskId);
  if (!found) return res.status(404).json({ error: "Task not found" });
  found.session.tasks.splice(found.index, 1);
  couple.bigDay = bigDay;
  await writeData(data);
  res.json({ bigDay });
});

// ---------- Sections ----------

app.get("/api/sections", async (req, res) => {
  const data = await readData();
  const sections = data.sections
    .filter((s) => s.coupleId === req.coupleId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  res.json(sections);
});

app.post("/api/sections", async (req, res) => {
  const { title, color } = req.body;
  if (!title || !color) {
    return res.status(400).json({ error: "title and color are required" });
  }
  const data = await readData();
  const coupleSections = data.sections.filter((s) => s.coupleId === req.coupleId);
  const nextPosition = coupleSections.length === 0 ? 0 : Math.max(...coupleSections.map((s) => s.position ?? 0)) + 1;
  const section = { id: uuid(), coupleId: req.coupleId, title, color, position: nextPosition };
  data.sections.push(section);
  await writeData(data);
  res.status(201).json(section);
});

app.put("/api/sections/reorder", async (req, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "orderedIds must be an array" });
  const data = await readData();
  orderedIds.forEach((id, index) => {
    const section = data.sections.find((s) => s.id === id && s.coupleId === req.coupleId);
    if (section) section.position = index;
  });
  await writeData(data);
  res.status(204).end();
});

app.put("/api/sections/:id", async (req, res) => {
  const { title, color } = req.body;
  const data = await readData();
  const section = data.sections.find((s) => s.id === req.params.id && s.coupleId === req.coupleId);
  if (!section) return res.status(404).json({ error: "Section not found" });
  if (title !== undefined) section.title = title;
  if (color !== undefined) section.color = color;
  await writeData(data);
  res.json(section);
});

app.delete("/api/sections/:id", async (req, res) => {
  const data = await readData();
  const exists = data.sections.some((s) => s.id === req.params.id && s.coupleId === req.coupleId);
  if (!exists) return res.status(404).json({ error: "Section not found" });
  data.sections = data.sections.filter((s) => s.id !== req.params.id);
  data.events.forEach((e) => {
    if (e.sectionId === req.params.id) e.sectionId = null;
  });
  await writeData(data);
  res.status(204).end();
});

// ---------- Events (important dates) ----------

app.get("/api/events", async (req, res) => {
  const data = await readData();
  res.json(data.events.filter((e) => e.coupleId === req.coupleId));
});

app.post("/api/events", async (req, res) => {
  const { title, date, time, sectionId, notes } = req.body;
  if (!title || !date) {
    return res.status(400).json({ error: "title and date are required" });
  }
  const data = await readData();
  const event = {
    id: uuid(),
    coupleId: req.coupleId,
    title,
    date,
    time: time || "",
    sectionId: sectionId || null,
    notes: notes || "",
    tasks: [],
    createdAt: new Date().toISOString(),
  };
  data.events.push(event);
  await writeData(data);
  res.status(201).json(event);
});

app.put("/api/events/:id", async (req, res) => {
  const { title, date, time, sectionId, notes } = req.body;
  const data = await readData();
  const event = data.events.find((e) => e.id === req.params.id && e.coupleId === req.coupleId);
  if (!event) return res.status(404).json({ error: "Event not found" });
  if (title !== undefined) event.title = title;
  if (date !== undefined) event.date = date;
  if (time !== undefined) event.time = time;
  if (sectionId !== undefined) event.sectionId = sectionId;
  if (notes !== undefined) event.notes = notes;
  await writeData(data);
  res.json(event);
});

app.delete("/api/events/:id", async (req, res) => {
  const data = await readData();
  const exists = data.events.some((e) => e.id === req.params.id && e.coupleId === req.coupleId);
  if (!exists) return res.status(404).json({ error: "Event not found" });
  data.events = data.events.filter((e) => e.id !== req.params.id);
  await writeData(data);
  res.status(204).end();
});

// ---------- Tasks (nested in events) ----------

app.post("/api/events/:id/tasks", async (req, res) => {
  const { name, assigneeUserId } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  const data = await readData();
  const event = data.events.find((e) => e.id === req.params.id && e.coupleId === req.coupleId);
  if (!event) return res.status(404).json({ error: "Event not found" });
  const task = {
    id: uuid(),
    name,
    assigneeUserId: assigneeUserId || null,
    createdByUserId: req.user.id,
    done: false,
  };
  event.tasks.push(task);
  await writeData(data);

  let message = `${req.user.name} added task "${name}" (${event.title})`;
  if (task.assigneeUserId) {
    const assignee = (data.users || []).find((u) => u.id === task.assigneeUserId && u.coupleId === req.coupleId);
    if (assignee) message = `${req.user.name} added "${name}" and assigned it to ${assignee.name} (${event.title})`;
  }
  await notifyOtherUsers(req.coupleId, req.user.id, message, "task", task.id, "task-created");

  res.status(201).json(task);
});

app.put("/api/events/:id/tasks/:taskId", async (req, res) => {
  const { name, assigneeUserId, done } = req.body;
  const data = await readData();
  const event = data.events.find((e) => e.id === req.params.id && e.coupleId === req.coupleId);
  if (!event) return res.status(404).json({ error: "Event not found" });
  const task = event.tasks.find((t) => t.id === req.params.taskId);
  if (!task) return res.status(404).json({ error: "Task not found" });
  const wasDone = task.done;
  const prevAssignee = task.assigneeUserId;
  if (name !== undefined) task.name = name;
  if (assigneeUserId !== undefined) task.assigneeUserId = assigneeUserId;
  if (done !== undefined) task.done = done;
  await writeData(data);

  if (done !== undefined && done && !wasDone) {
    await notifyOtherUsers(req.coupleId, req.user.id, `${req.user.name} completed "${task.name}" (${event.title})`, "task", task.id, "task-completed");
  }
  if (done !== undefined && !done && wasDone) {
    await cancelPendingNotifications(task.id, "task-completed");
  }
  if (assigneeUserId !== undefined && assigneeUserId !== prevAssignee) {
    await cancelPendingNotifications(task.id, "task-assigned");
    if (assigneeUserId) {
      const assignee = (data.users || []).find((u) => u.id === assigneeUserId && u.coupleId === req.coupleId);
      if (assignee) {
        await notifyOtherUsers(
          req.coupleId,
          req.user.id,
          `${req.user.name} assigned "${task.name}" to ${assignee.name} (${event.title})`,
          "task",
          task.id,
          "task-assigned"
        );
      }
    }
  }

  res.json(task);
});

app.delete("/api/events/:id/tasks/:taskId", async (req, res) => {
  const data = await readData();
  const event = data.events.find((e) => e.id === req.params.id && e.coupleId === req.coupleId);
  if (!event) return res.status(404).json({ error: "Event not found" });
  event.tasks = event.tasks.filter((t) => t.id !== req.params.taskId);
  await writeData(data);
  await cancelPendingNotifications(req.params.taskId);
  res.status(204).end();
});

// ---------- Day to-dos (per calendar date) ----------

app.get("/api/todos", async (req, res) => {
  const data = await readData();
  res.json(data.todos.filter((t) => t.coupleId === req.coupleId));
});

app.post("/api/todos", async (req, res) => {
  const { date, text, assigneeUserId } = req.body;
  if (!date || !text || !text.trim()) {
    return res.status(400).json({ error: "date and text are required" });
  }
  const data = await readData();
  const todo = {
    id: uuid(),
    coupleId: req.coupleId,
    date,
    text: text.trim(),
    assigneeUserId: assigneeUserId || null,
    createdByUserId: req.user.id,
    done: false,
    createdAt: new Date().toISOString(),
  };
  data.todos.push(todo);
  await writeData(data);

  let message = `${req.user.name} added a to-do "${todo.text}"`;
  if (todo.assigneeUserId) {
    const assignee = (data.users || []).find((u) => u.id === todo.assigneeUserId && u.coupleId === req.coupleId);
    if (assignee) message = `${req.user.name} added "${todo.text}" and assigned it to ${assignee.name}`;
  }
  await notifyOtherUsers(req.coupleId, req.user.id, message, "todo", todo.id, "todo-created");

  res.status(201).json(todo);
});

app.put("/api/todos/:id", async (req, res) => {
  const { text, assigneeUserId, done } = req.body;
  const data = await readData();
  const todo = data.todos.find((t) => t.id === req.params.id && t.coupleId === req.coupleId);
  if (!todo) return res.status(404).json({ error: "Todo not found" });
  const wasDone = todo.done;
  const prevAssignee = todo.assigneeUserId;
  if (text !== undefined) todo.text = text;
  if (assigneeUserId !== undefined) todo.assigneeUserId = assigneeUserId;
  if (done !== undefined) todo.done = done;
  await writeData(data);

  if (done !== undefined && done && !wasDone) {
    await notifyOtherUsers(req.coupleId, req.user.id, `${req.user.name} completed to-do "${todo.text}"`, "todo", todo.id, "todo-completed");
  }
  if (done !== undefined && !done && wasDone) {
    await cancelPendingNotifications(todo.id, "todo-completed");
  }
  if (assigneeUserId !== undefined && assigneeUserId !== prevAssignee) {
    await cancelPendingNotifications(todo.id, "todo-assigned");
    if (assigneeUserId) {
      const assignee = (data.users || []).find((u) => u.id === assigneeUserId && u.coupleId === req.coupleId);
      if (assignee) {
        await notifyOtherUsers(req.coupleId, req.user.id, `${req.user.name} assigned "${todo.text}" to ${assignee.name}`, "todo", todo.id, "todo-assigned");
      }
    }
  }

  res.json(todo);
});

app.delete("/api/todos/:id", async (req, res) => {
  const data = await readData();
  const exists = data.todos.some((t) => t.id === req.params.id && t.coupleId === req.coupleId);
  if (!exists) return res.status(404).json({ error: "Todo not found" });
  data.todos = data.todos.filter((t) => t.id !== req.params.id);
  await writeData(data);
  await cancelPendingNotifications(req.params.id);
  res.status(204).end();
});

// ---------- Guest owners & their guest lists ----------

app.get("/api/guest-owners", async (req, res) => {
  const data = await readData();
  res.json(data.guestOwners.filter((o) => o.coupleId === req.coupleId));
});

// PUBLIC (guest invite link) — scoped by the owner's own random id, not by session.
app.get("/api/guest-owners/:id", async (req, res) => {
  const data = await readData();
  const owner = data.guestOwners.find((o) => o.id === req.params.id);
  if (!owner) return res.status(404).json({ error: "Guest list not found" });
  const couple = (data.couples || []).find((c) => c.id === owner.coupleId);
  res.json({
    ...owner,
    partner1Name: couple?.partner1Name ?? null,
    partner2Name: couple?.partner2Name ?? null,
  });
});

app.post("/api/guest-owners", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  const data = await readData();
  const owner = {
    id: generateUniqueGuestOwnerId(data.guestOwners),
    coupleId: req.coupleId,
    name,
    categories: [{ id: uuid(), ownerId: null, title: "Family" }],
    guests: [],
    createdAt: new Date().toISOString(),
  };
  owner.categories[0].ownerId = owner.id;
  data.guestOwners.push(owner);
  await writeData(data);
  res.status(201).json(owner);
});

app.put("/api/guest-owners/:id", async (req, res) => {
  const { name } = req.body;
  const data = await readData();
  const owner = data.guestOwners.find((o) => o.id === req.params.id && o.coupleId === req.coupleId);
  if (!owner) return res.status(404).json({ error: "Guest list not found" });
  if (name !== undefined) owner.name = name;
  await writeData(data);
  res.json(owner);
});

app.delete("/api/guest-owners/:id", async (req, res) => {
  const data = await readData();
  const coupleOwners = data.guestOwners.filter((o) => o.coupleId === req.coupleId);
  const index = coupleOwners.findIndex((o) => o.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Guest list not found" });
  if (index < 2) return res.status(400).json({ error: "The Bride and Groom lists can't be deleted" });
  data.guestOwners = data.guestOwners.filter((o) => o.id !== req.params.id);
  await writeData(data);
  res.status(204).end();
});

// PUBLIC (also reachable from the guest invite link, not just the couple's
// own app) — scoped by the owner's own random id, same as the guest
// add/edit/delete routes below, since there's no session for a public caller.
app.post("/api/guest-owners/:id/categories", async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });
  const data = await readData();
  const owner = data.guestOwners.find((o) => o.id === req.params.id);
  if (!owner) return res.status(404).json({ error: "Guest list not found" });
  const category = { id: uuid(), ownerId: owner.id, title };
  owner.categories = owner.categories || [];
  owner.categories.push(category);
  await writeData(data);
  res.status(201).json(category);
});

app.put("/api/guest-owners/:id/categories/:categoryId", async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: "title is required" });
  const data = await readData();
  const owner = data.guestOwners.find((o) => o.id === req.params.id && o.coupleId === req.coupleId);
  if (!owner) return res.status(404).json({ error: "Guest list not found" });
  const category = (owner.categories || []).find((cat) => cat.id === req.params.categoryId);
  if (!category) return res.status(404).json({ error: "List not found" });
  category.title = title.trim();
  await writeData(data);
  res.json(category);
});

app.delete("/api/guest-owners/:id/categories/:categoryId", async (req, res) => {
  const data = await readData();
  const owner = data.guestOwners.find((o) => o.id === req.params.id && o.coupleId === req.coupleId);
  if (!owner) return res.status(404).json({ error: "Guest list not found" });
  const exists = (owner.categories || []).some((cat) => cat.id === req.params.categoryId);
  if (!exists) return res.status(404).json({ error: "List not found" });
  owner.categories = owner.categories.filter((cat) => cat.id !== req.params.categoryId);
  owner.guests = owner.guests.filter((g) => g.categoryId !== req.params.categoryId);
  await writeData(data);
  res.status(204).end();
});

function toPlusCount(value) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// PUBLIC (guest invite link) below — owner is looked up by its own id only,
// same security model as today: no coupleId is available (or needed) since
// these submissions are unauthenticated, and the nested guest/category
// inherits scoping automatically by living inside the correct owner object.
app.post("/api/guest-owners/:id/guests", async (req, res) => {
  const { name, plusCount, categoryId, isVip, phone, email, address, notes } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  const data = await readData();
  const owner = data.guestOwners.find((o) => o.id === req.params.id);
  if (!owner) return res.status(404).json({ error: "Guest list not found" });

  let targetCategoryId = categoryId;
  if (targetCategoryId) {
    const category = (owner.categories || []).find((cat) => cat.id === targetCategoryId);
    if (!category) return res.status(404).json({ error: "List not found" });
  } else {
    // Public invite-link submissions omit categoryId; those always land in a
    // plain "Guests" list (never Family, never VIP), creating it on first use.
    owner.categories = owner.categories || [];
    let guestsCategory = owner.categories.find((cat) => cat.title.trim().toLowerCase() === "guests");
    if (!guestsCategory) {
      guestsCategory = { id: uuid(), ownerId: owner.id, title: "Guests" };
      owner.categories.push(guestsCategory);
    }
    targetCategoryId = guestsCategory.id;
  }

  const guest = {
    id: uuid(),
    name,
    plusCount: toPlusCount(plusCount),
    categoryId: targetCategoryId,
    isVip: categoryId ? Boolean(isVip) : false,
    included: true,
    phone: phone || "",
    email: email || "",
    address: address || "",
    notes: notes || "",
  };
  owner.guests.push(guest);
  await writeData(data);
  res.status(201).json(guest);
});

app.put("/api/guest-owners/:id/guests/:guestId", async (req, res) => {
  const { name, plusCount, isVip, included, phone, email, address, notes } = req.body;
  const data = await readData();
  const owner = data.guestOwners.find((o) => o.id === req.params.id);
  if (!owner) return res.status(404).json({ error: "Guest list not found" });
  const guest = owner.guests.find((g) => g.id === req.params.guestId);
  if (!guest) return res.status(404).json({ error: "Guest not found" });
  if (name !== undefined) guest.name = name;
  if (plusCount !== undefined) guest.plusCount = toPlusCount(plusCount);
  if (isVip !== undefined) guest.isVip = Boolean(isVip);
  if (included !== undefined) guest.included = Boolean(included);
  if (phone !== undefined) guest.phone = phone;
  if (email !== undefined) guest.email = email;
  if (address !== undefined) guest.address = address;
  if (notes !== undefined) guest.notes = notes;
  await writeData(data);
  res.json(guest);
});

app.delete("/api/guest-owners/:id/guests/:guestId", async (req, res) => {
  const data = await readData();
  const owner = data.guestOwners.find((o) => o.id === req.params.id);
  if (!owner) return res.status(404).json({ error: "Guest list not found" });
  owner.guests = owner.guests.filter((g) => g.id !== req.params.guestId);
  await writeData(data);
  res.status(204).end();
});

// ---------- Inspiration board (link-based images/videos) ----------

app.get("/api/inspiration", async (req, res) => {
  const data = await readData();
  const sorted = data.inspirationItems
    .filter((i) => i.coupleId === req.coupleId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(sorted);
});

app.post("/api/inspiration", async (req, res) => {
  const { url, caption, categoryId } = req.body;
  if (!url || !url.trim()) {
    return res.status(400).json({ error: "url is required" });
  }
  const data = await readData();
  const item = {
    id: uuid(),
    coupleId: req.coupleId,
    url: url.trim(),
    caption: caption || "",
    categoryId: categoryId || null,
    approved: false,
    createdAt: new Date().toISOString(),
  };
  data.inspirationItems.push(item);
  await writeData(data);
  res.status(201).json(item);
});

app.put("/api/inspiration/:id", async (req, res) => {
  const { caption, approved, categoryId } = req.body;
  const data = await readData();
  const item = data.inspirationItems.find((i) => i.id === req.params.id && i.coupleId === req.coupleId);
  if (!item) return res.status(404).json({ error: "Inspiration item not found" });
  if (caption !== undefined) item.caption = caption;
  if (approved !== undefined) item.approved = approved;
  if (categoryId !== undefined) item.categoryId = categoryId;
  await writeData(data);
  res.json(item);
});

app.delete("/api/inspiration/:id", async (req, res) => {
  const data = await readData();
  const exists = data.inspirationItems.some((i) => i.id === req.params.id && i.coupleId === req.coupleId);
  if (!exists) return res.status(404).json({ error: "Inspiration item not found" });
  data.inspirationItems = data.inspirationItems.filter((i) => i.id !== req.params.id);
  await writeData(data);
  res.status(204).end();
});

// ---------- Inspiration categories ----------

app.get("/api/inspiration-categories", async (req, res) => {
  const data = await readData();
  res.json(data.inspirationCategories.filter((c) => c.coupleId === req.coupleId));
});

app.post("/api/inspiration-categories", async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "title is required" });
  }
  const data = await readData();
  const category = { id: uuid(), coupleId: req.coupleId, title: title.trim(), createdAt: new Date().toISOString() };
  data.inspirationCategories.push(category);
  await writeData(data);
  res.status(201).json(category);
});

app.delete("/api/inspiration-categories/:id", async (req, res) => {
  const data = await readData();
  const exists = data.inspirationCategories.some((c) => c.id === req.params.id && c.coupleId === req.coupleId);
  if (!exists) return res.status(404).json({ error: "Category not found" });
  data.inspirationCategories = data.inspirationCategories.filter((c) => c.id !== req.params.id);
  data.inspirationItems.forEach((item) => {
    if (item.categoryId === req.params.id) item.categoryId = null;
  });
  await writeData(data);
  res.status(204).end();
});

// ---------- Link preview resolver (for links that aren't direct image URLs, e.g. Pinterest pins) ----------

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractOgImage(html) {
  const metaTags = html.match(/<meta[^>]+>/gi) || [];
  for (const tag of metaTags) {
    const isOgImage = /(?:property|name)=["']og:image["']/i.test(tag);
    if (!isOgImage) continue;
    const contentMatch = tag.match(/content=["']([^"']+)["']/i);
    if (contentMatch) return decodeHtmlEntities(contentMatch[1]);
  }
  return null;
}

// TikTok pages are client-side rendered, so scraping the raw HTML for
// og:image never finds a real thumbnail. TikTok's public oEmbed endpoint
// (no API key needed) gives the real thumbnail AND resolves short share
// links (vm.tiktok.com, tiktok.com/t/...) to the numeric video id embedded
// in its "html" field — the same id needed to build a playable embed URL,
// which the client can't extract itself from a short link.
async function resolveTikTokOembed(url, signal) {
  const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
  const response = await fetch(oembedUrl, { signal });
  if (!response.ok) return null;
  const data = await response.json();
  const idMatch = (data.html || "").match(/data-video-id="(\d+)"/);
  return {
    imageUrl: data.thumbnail_url || null,
    embedUrl: idMatch ? `https://www.tiktok.com/embed/v2/${idMatch[1]}` : null,
  };
}

app.get("/api/resolve-preview", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "url is required" });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    let host = "";
    try {
      host = new URL(url).hostname;
    } catch {
      // fall through to generic scraping below
    }

    if (/(^|\.)tiktok\.com$/.test(host)) {
      const resolved = await resolveTikTokOembed(url, controller.signal);
      clearTimeout(timeout);
      if (resolved?.imageUrl) return res.json(resolved);
      return res.status(502).json({ error: "Could not resolve a preview image for this link" });
    }

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });
    clearTimeout(timeout);
    const html = await response.text();
    const imageUrl = extractOgImage(html);
    res.json({ imageUrl });
  } catch (err) {
    clearTimeout(timeout);
    res.status(502).json({ error: "Could not resolve a preview image for this link" });
  }
});

// ---------- Budget ----------

app.get("/api/budget", async (req, res) => {
  const data = await readData();
  const couple = (data.couples || []).find((c) => c.id === req.coupleId);
  res.json({
    total: couple?.budgetTotal ?? 0,
    savings: couple?.savings ?? 0,
    homeCurrency: validCurrency(couple?.homeCurrency),
  });
});

app.put("/api/budget", async (req, res) => {
  const { total, savings, homeCurrency } = req.body;
  const data = await readData();
  const couple = (data.couples || []).find((c) => c.id === req.coupleId);
  if (total !== undefined) couple.budgetTotal = Math.max(0, Number(total) || 0);
  if (savings !== undefined) couple.savings = Math.max(0, Number(savings) || 0);
  if (homeCurrency !== undefined) couple.homeCurrency = validCurrency(homeCurrency);
  await writeData(data);
  res.json({
    total: couple.budgetTotal,
    savings: couple.savings ?? 0,
    homeCurrency: validCurrency(couple.homeCurrency),
  });
});

app.get("/api/budget-items", async (req, res) => {
  const data = await readData();
  res.json(data.budgetItems.filter((b) => b.coupleId === req.coupleId));
});

app.post("/api/budget-items", async (req, res) => {
  const { item, category, estimated, actual, paid, currency, notes, extras } = req.body;
  if (!item || !item.trim()) {
    return res.status(400).json({ error: "item is required" });
  }
  const data = await readData();
  const budgetItem = {
    id: uuid(),
    coupleId: req.coupleId,
    item: item.trim(),
    category: category || "Other",
    currency: validCurrency(currency),
    estimated: Math.max(0, Number(estimated) || 0),
    actual: Math.max(0, Number(actual) || 0),
    paid: Boolean(paid),
    notes: notes || "",
    extras: sanitizeExtras(extras),
    createdAt: new Date().toISOString(),
  };
  data.budgetItems.push(budgetItem);
  await writeData(data);
  res.status(201).json(budgetItem);
});

app.put("/api/budget-items/:id", async (req, res) => {
  const { item, category, estimated, actual, paid, currency, notes, extras } = req.body;
  const data = await readData();
  const budgetItem = data.budgetItems.find((b) => b.id === req.params.id && b.coupleId === req.coupleId);
  if (!budgetItem) return res.status(404).json({ error: "Budget item not found" });
  const wasPaid = budgetItem.paid;
  if (item !== undefined) budgetItem.item = item;
  if (category !== undefined) budgetItem.category = category;
  if (currency !== undefined) budgetItem.currency = validCurrency(currency);
  if (estimated !== undefined) budgetItem.estimated = Math.max(0, Number(estimated) || 0);
  if (actual !== undefined) budgetItem.actual = Math.max(0, Number(actual) || 0);
  if (paid !== undefined) budgetItem.paid = Boolean(paid);
  if (notes !== undefined) budgetItem.notes = notes;
  if (extras !== undefined) budgetItem.extras = sanitizeExtras(extras);
  await writeData(data);

  if (paid !== undefined && budgetItem.paid !== wasPaid) {
    if (budgetItem.paid) {
      await cancelPendingNotifications(budgetItem.id, "budget-unpaid");
      await notifyOtherUsers(req.coupleId, req.user.id, `${req.user.name} marked "${budgetItem.item}" as paid`, "budget", budgetItem.id, "budget-paid");
    } else {
      await cancelPendingNotifications(budgetItem.id, "budget-paid");
      await notifyOtherUsers(req.coupleId, req.user.id, `${req.user.name} marked "${budgetItem.item}" as unpaid`, "budget", budgetItem.id, "budget-unpaid");
    }
  }

  res.json(budgetItem);
});

app.delete("/api/budget-items/:id", async (req, res) => {
  const data = await readData();
  const exists = data.budgetItems.some((b) => b.id === req.params.id && b.coupleId === req.coupleId);
  if (!exists) return res.status(404).json({ error: "Budget item not found" });
  data.budgetItems = data.budgetItems.filter((b) => b.id !== req.params.id);
  await writeData(data);
  await cancelPendingNotifications(req.params.id);
  res.status(204).end();
});

// ---------- Budget categories ----------

app.get("/api/budget-categories", async (req, res) => {
  const data = await readData();
  res.json(data.budgetCategories.filter((c) => c.coupleId === req.coupleId));
});

app.post("/api/budget-categories", async (req, res) => {
  const { title, color } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "title is required" });
  }
  const data = await readData();
  const category = {
    id: uuid(),
    coupleId: req.coupleId,
    title: title.trim(),
    color: color || "#7C9885",
    createdAt: new Date().toISOString(),
  };
  data.budgetCategories.push(category);
  await writeData(data);
  res.status(201).json(category);
});

app.put("/api/budget-categories/:id", async (req, res) => {
  const data = await readData();
  const category = data.budgetCategories.find((c) => c.id === req.params.id && c.coupleId === req.coupleId);
  if (!category) return res.status(404).json({ error: "Category not found" });
  if (req.body.title !== undefined) category.title = req.body.title;
  if (req.body.color !== undefined) category.color = req.body.color;
  await writeData(data);
  res.json(category);
});

app.delete("/api/budget-categories/:id", async (req, res) => {
  const data = await readData();
  const exists = data.budgetCategories.some((c) => c.id === req.params.id && c.coupleId === req.coupleId);
  if (!exists) return res.status(404).json({ error: "Category not found" });
  data.budgetCategories = data.budgetCategories.filter((c) => c.id !== req.params.id);
  await writeData(data);
  res.status(204).end();
});

// ---------- Exchange rate (every supported currency, relative to SGD, shared across all couples) ----------

const FOREIGN_CURRENCIES = CURRENCIES.filter((c) => c !== "SGD");
const DEFAULT_RATES = {
  SGD: 1,
  MYR: 0.3128,
  THB: 0.0375,
  PHP: 0.0237,
  USD: 1.34,
  EUR: 1.45,
  GBP: 1.7,
  JPY: 0.0089,
  CNY: 0.186,
  KRW: 0.00097,
};

// Older data.json files only have { myrToSgd }: normalize on read so a
// couple's home currency can be any of the four, not just SGD.
function normalizedExchangeRate(exchangeRate) {
  if (exchangeRate?.rates) return exchangeRate;
  const myrToSgd = exchangeRate?.myrToSgd ?? DEFAULT_RATES.MYR;
  return {
    base: "SGD",
    rates: { ...DEFAULT_RATES, MYR: myrToSgd },
    updatedAt: exchangeRate?.updatedAt ?? null,
    source: exchangeRate?.source ?? "default",
  };
}

app.get("/api/exchange-rate", async (req, res) => {
  const data = await readData();
  res.json(normalizedExchangeRate(data.exchangeRate));
});

app.post("/api/exchange-rate/refresh", async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(
      `https://api.frankfurter.app/latest?from=SGD&to=${FOREIGN_CURRENCIES.join(",")}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    const json = await response.json();
    const rates = { SGD: 1 };
    for (const currency of FOREIGN_CURRENCIES) {
      const sgdPerUnit = json?.rates?.[currency];
      if (!sgdPerUnit) throw new Error(`No ${currency} rate in response`);
      rates[currency] = 1 / sgdPerUnit;
    }
    const data = await readData();
    data.exchangeRate = {
      base: "SGD",
      rates,
      updatedAt: new Date().toISOString(),
      source: "frankfurter.app (ECB reference rates)",
    };
    await writeData(data);
    res.json(data.exchangeRate);
  } catch (err) {
    res.status(502).json({ error: "Could not fetch live rates right now. You can enter them manually below." });
  }
});

app.put("/api/exchange-rate", async (req, res) => {
  const { rates: patch } = req.body;
  if (!patch || typeof patch !== "object") {
    return res.status(400).json({ error: "rates must be an object of currency -> SGD value" });
  }
  const data = await readData();
  const current = normalizedExchangeRate(data.exchangeRate);
  const rates = { ...current.rates };
  for (const currency of FOREIGN_CURRENCIES) {
    if (patch[currency] === undefined) continue;
    if (!(Number(patch[currency]) > 0)) {
      return res.status(400).json({ error: `${currency} rate must be a positive number` });
    }
    rates[currency] = Number(patch[currency]);
  }
  data.exchangeRate = { base: "SGD", rates, updatedAt: new Date().toISOString(), source: "manual" };
  await writeData(data);
  res.json(data.exchangeRate);
});

// ---------- Vendor categories ----------

app.get("/api/vendor-categories", async (req, res) => {
  const data = await readData();
  res.json((data.vendorCategories || []).filter((c) => c.coupleId === req.coupleId));
});

app.post("/api/vendor-categories", async (req, res) => {
  const { title, color } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: "title is required" });
  const data = await readData();
  data.vendorCategories = data.vendorCategories || [];
  const category = {
    id: uuid(),
    coupleId: req.coupleId,
    title: title.trim(),
    color: color || "#7C9885",
    createdAt: new Date().toISOString(),
  };
  data.vendorCategories.push(category);
  await writeData(data);
  res.status(201).json(category);
});

app.put("/api/vendor-categories/:id", async (req, res) => {
  const data = await readData();
  data.vendorCategories = data.vendorCategories || [];
  const category = data.vendorCategories.find((c) => c.id === req.params.id && c.coupleId === req.coupleId);
  if (!category) return res.status(404).json({ error: "Category not found" });
  if (req.body.title !== undefined) category.title = req.body.title;
  if (req.body.color !== undefined) category.color = req.body.color;
  await writeData(data);
  res.json(category);
});

app.delete("/api/vendor-categories/:id", async (req, res) => {
  const data = await readData();
  data.vendorCategories = data.vendorCategories || [];
  const exists = data.vendorCategories.some((c) => c.id === req.params.id && c.coupleId === req.coupleId);
  if (!exists) return res.status(404).json({ error: "Category not found" });
  data.vendorCategories = data.vendorCategories.filter((c) => c.id !== req.params.id);
  await writeData(data);
  res.status(204).end();
});

// ---------- Vendors ----------

app.get("/api/vendors", async (req, res) => {
  const data = await readData();
  res.json(data.vendors.filter((v) => v.coupleId === req.coupleId));
});

app.post("/api/vendors", async (req, res) => {
  const { name, category, contact, cost, status, notes, currency, budgetCategory, downpayment, extras } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }
  const data = await readData();
  const vendor = {
    id: uuid(),
    coupleId: req.coupleId,
    name: name.trim(),
    category: category || "",
    contact: contact || "",
    cost: Math.max(0, Number(cost) || 0),
    status: status || "inquired",
    notes: notes || "",
    createdAt: new Date().toISOString(),
    currency: validCurrency(currency),
    budgetCategory: budgetCategory !== undefined ? budgetCategory : category || "",
    downpayment: Math.max(0, Number(downpayment) || 0),
    extras: sanitizeExtras(extras),
  };
  data.vendors.push(vendor);
  await writeData(data);
  res.status(201).json(vendor);
});

// Keeps a vendor's "Paid" status mirrored into an Uncategorized budget
// expense: marking paid creates it (name + cost, MYR since vendor cost is
// always entered in RM), editing name/cost while still paid keeps it in
// sync, and un-marking paid removes it again so nothing stale is left
// behind. The link is soft (sourceVendorId) — if the user deletes the
// budget line manually, later vendor edits just won't recreate it.
async function syncVendorBudgetLink(data, vendor, wasPaid, wasName, wasCost) {
  const isPaid = vendor.status === "paid";
  const linked = data.budgetItems.find((b) => b.sourceVendorId === vendor.id);

  if (!wasPaid && isPaid) {
    if (linked) {
      linked.item = vendor.name;
      linked.estimated = vendor.cost;
      linked.actual = vendor.cost;
      linked.paid = true;
    } else {
      data.budgetItems.push({
        id: uuid(),
        coupleId: vendor.coupleId,
        item: vendor.name,
        category: "",
        currency: validCurrency(vendor.currency),
        estimated: vendor.cost,
        actual: vendor.cost,
        paid: true,
        createdAt: new Date().toISOString(),
        sourceVendorId: vendor.id,
      });
    }
  } else if (wasPaid && !isPaid) {
    if (linked) data.budgetItems = data.budgetItems.filter((b) => b.id !== linked.id);
  } else if (wasPaid && isPaid && linked && (vendor.name !== wasName || vendor.cost !== wasCost)) {
    linked.item = vendor.name;
    linked.estimated = vendor.cost;
    linked.actual = vendor.cost;
  }
}

app.put("/api/vendors/:id", async (req, res) => {
  const { name, category, contact, cost, status, notes, currency, budgetCategory, downpayment, extras } = req.body;
  const data = await readData();
  const vendor = data.vendors.find((v) => v.id === req.params.id && v.coupleId === req.coupleId);
  if (!vendor) return res.status(404).json({ error: "Vendor not found" });
  const wasPaid = vendor.status === "paid";
  const wasName = vendor.name;
  const wasCost = vendor.cost;
  if (name !== undefined) vendor.name = name;
  if (category !== undefined) vendor.category = category;
  if (contact !== undefined) vendor.contact = contact;
  if (cost !== undefined) vendor.cost = Math.max(0, Number(cost) || 0);
  if (status !== undefined) vendor.status = status;
  if (notes !== undefined) vendor.notes = notes;
  if (currency !== undefined) vendor.currency = validCurrency(currency);
  if (budgetCategory !== undefined) vendor.budgetCategory = budgetCategory;
  if (downpayment !== undefined) vendor.downpayment = Math.max(0, Number(downpayment) || 0);
  if (extras !== undefined) vendor.extras = sanitizeExtras(extras);
  await syncVendorBudgetLink(data, vendor, wasPaid, wasName, wasCost);
  await writeData(data);
  res.json(vendor);
});

app.delete("/api/vendors/:id", async (req, res) => {
  const data = await readData();
  const exists = data.vendors.some((v) => v.id === req.params.id && v.coupleId === req.coupleId);
  if (!exists) return res.status(404).json({ error: "Vendor not found" });
  data.vendors = data.vendors.filter((v) => v.id !== req.params.id);
  data.budgetItems = data.budgetItems.filter((b) => b.sourceVendorId !== req.params.id);
  await writeData(data);
  res.status(204).end();
});

// ---------- Image uploads (dev stub — production uses R2 via Cloudflare Functions) ----------

app.post("/api/upload", async (req, res) => {
  res.status(501).json({ error: "Image upload isn't available in local dev" });
});

// ---------- Serve the built React app (production) ----------

if (existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Wedding planner API listening on http://localhost:${PORT}`);
});
