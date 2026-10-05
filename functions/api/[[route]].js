import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { handle } from "hono/cloudflare-pages";
import { env } from "hono/adapter";
import { clerkMiddleware, getAuth } from "@clerk/hono";

const app = new Hono().basePath("/api");
app.use("*", cors());

// Clerk sign-in runs alongside the original password sessions while couples
// move over. It only switches on where the Clerk keys are configured.
const clerk = clerkMiddleware();
app.use("*", async (c, next) => {
  const keys = env(c);
  if (!keys.CLERK_SECRET_KEY || !keys.CLERK_PUBLISHABLE_KEY) return next();
  return clerk(c, next);
});

function clerkUserIdOf(c) {
  try {
    return getAuth(c)?.userId ?? null;
  } catch {
    return null; // Clerk not configured here
  }
}

// ---------- Auth helpers ----------

const SESSION_MAX_AGE_SECONDS = 90 * 24 * 60 * 60; // 90 days

function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

async function hashPassword(password, saltHex) {
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return { hash: bytesToHex(new Uint8Array(bits)), salt: bytesToHex(salt) };
}

function randomToken() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
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

async function generateUniqueShortId(db, table) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateShortId();
    const existing = await db.prepare(`SELECT id FROM ${table} WHERE id = ?`).bind(candidate).first();
    if (!existing) return candidate;
  }
  return crypto.randomUUID();
}

async function createSession(db, c, userId) {
  const token = randomToken();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);
  await db.prepare("INSERT INTO sessions (token, userId, createdAt, expiresAt) VALUES (?,?,?,?)")
    .bind(token, userId, now.toISOString(), expires.toISOString())
    .run();
  setCookie(c, "session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

function isPublicGuestInvitePath(path, method) {
  const ownerMatch = path.match(/^\/guest-owners\/[^/]+$/);
  if (ownerMatch && method === "GET") return true;
  const guestsMatch = path.match(/^\/guest-owners\/[^/]+\/guests(\/[^/]+)?$/);
  if (guestsMatch && (method === "POST" || method === "PUT" || method === "DELETE")) return true;
  const categoriesMatch = path.match(/^\/guest-owners\/[^/]+\/categories$/);
  if (categoriesMatch && method === "POST") return true;
  return false;
}

function isPublicCouplePath(path, method) {
  if (/^\/couples\/[^/]+\/auth-status$/.test(path) && method === "GET") return true;
  if (/^\/couples\/[^/]+\/login$/.test(path) && method === "POST") return true;
  return false;
}

const PUBLIC_AUTH_PATHS = new Set(["/auth/logout", "/signup", "/default-couple"]);

app.use("*", async (c, next) => {
  const path = c.req.path.replace(/^\/api/, "") || "/";
  const token = getCookie(c, "session");
  if (token) {
    const session = await c.env.DB.prepare("SELECT * FROM sessions WHERE token = ?").bind(token).first();
    if (session && new Date(session.expiresAt) > new Date()) {
      const user = await c.env.DB.prepare("SELECT id, name, coupleId FROM users WHERE id = ?").bind(session.userId).first();
      if (user) {
        c.set("user", { id: user.id, name: user.name });
        c.set("coupleId", user.coupleId);
      }
    }
  }
  // Signed in with Clerk: find the partner linked to that Clerk account.
  const clerkUserId = clerkUserIdOf(c);
  if (clerkUserId) c.set("clerkUserId", clerkUserId);
  if (!c.get("user") && clerkUserId) {
    const user = await c.env.DB.prepare("SELECT id, name, coupleId FROM users WHERE clerkUserId = ?")
      .bind(clerkUserId)
      .first();
    if (user) {
      c.set("user", { id: user.id, name: user.name });
      c.set("coupleId", user.coupleId);
    }
  }
  if (PUBLIC_AUTH_PATHS.has(path) || isPublicGuestInvitePath(path, c.req.method) || isPublicCouplePath(path, c.req.method)) {
    return next();
  }
  // /account/* only needs a Clerk sign-in (the account may not be linked to a
  // planner yet); reading an invite is public so the invite page can show it.
  if (path.startsWith("/account/")) {
    if (/^\/account\/invites\/[^/]+$/.test(path) && c.req.method === "GET") return next();
    if (!clerkUserId) return c.json({ error: "Not signed in" }, 401);
    return next();
  }
  if (!c.get("user")) return c.json({ error: "Not authenticated" }, 401);
  return next();
});

const NOTIFICATION_BUFFER_MS = 10 * 60 * 1000; // 10 minutes

// Notifications are inserted immediately but stamped with a scheduledFor
// timestamp NOTIFICATION_BUFFER_MS in the future; the read endpoint only
// returns rows whose scheduledFor has passed. That way a quick create-then-
// undo (e.g. adding a task, then deleting it because it was wrong) never
// surfaces at all — see cancelPendingNotifications, called from the routes
// that revert an action within the buffer window.
async function notifyOtherUsers(db, coupleId, actorUserId, message, entityType, entityId, kind) {
  const couple = await db.prepare("SELECT notificationsHoldUntil FROM couples WHERE id = ?").bind(coupleId).first();
  if (couple?.notificationsHoldUntil && new Date().toISOString().slice(0, 10) < couple.notificationsHoldUntil) return;
  const { results: others } = await db.prepare("SELECT id FROM users WHERE coupleId = ? AND id != ?")
    .bind(coupleId, actorUserId)
    .all();
  const scheduledFor = new Date(Date.now() + NOTIFICATION_BUFFER_MS).toISOString();
  for (const u of others) {
    await db
      .prepare(
        "INSERT INTO notifications (id, coupleId, userId, actorUserId, message, entityType, entityId, kind, read, createdAt, scheduledFor) VALUES (?,?,?,?,?,?,?,?,0,?,?)"
      )
      .bind(crypto.randomUUID(), coupleId, u.id, actorUserId, message, entityType, entityId, kind, new Date().toISOString(), scheduledFor)
      .run();
  }
}

// Deletes any not-yet-visible (scheduledFor still in the future) pending
// notifications for an entity, optionally scoped to one kind. Used when an
// action is reverted within the buffer window (task/todo deleted,
// un-completed, or reassigned again) so the stale notification never shows.
async function cancelPendingNotifications(db, entityId, kind) {
  const now = new Date().toISOString();
  if (kind) {
    await db.prepare("DELETE FROM notifications WHERE entityId = ? AND kind = ? AND scheduledFor > ?")
      .bind(entityId, kind, now)
      .run();
  } else {
    await db.prepare("DELETE FROM notifications WHERE entityId = ? AND scheduledFor > ?")
      .bind(entityId, now)
      .run();
  }
}

// ---------- Signup & couple-scoped auth routes ----------

const RESERVED_SLUGS = new Set(["signup", "sign-in", "sign-up", "start", "join", "guests", "login", "api", "w", "assets", "terms", "privacy"]);

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function generateCoupleSlug(db, partner1Name, partner2Name) {
  const base = [slugify(partner1Name), slugify(partner2Name)].filter(Boolean).join("-") || "couple";
  let candidate = base;
  let suffix = 2;
  while (
    RESERVED_SLUGS.has(candidate) ||
    (await db.prepare("SELECT id FROM couples WHERE id = ?").bind(candidate).first())
  ) {
    candidate = `${base}-${suffix}`;
    suffix++;
  }
  return candidate;
}

app.post("/signup", async (c) => {
  const { partner1, partner2, weddingDate } = await c.req.json();
  if (!partner1?.name?.trim() || !partner1?.password || !partner2?.name?.trim() || !partner2?.password) {
    return c.json({ error: "A name and password are required for both partners" }, 400);
  }
  const coupleId = await generateCoupleSlug(c.env.DB, partner1.name.trim(), partner2.name.trim());
  const p1Hash = await hashPassword(partner1.password);
  const p2Hash = await hashPassword(partner2.password);
  const p1Id = crypto.randomUUID();
  const p2Id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO couples (id, partner1Name, partner2Name, weddingDate, budgetTotal, notificationsHoldUntil, createdAt) VALUES (?,?,?,?,0,NULL,?)"
    ).bind(coupleId, partner1.name.trim(), partner2.name.trim(), weddingDate || null, createdAt),
    c.env.DB.prepare("INSERT INTO users (id, coupleId, name, passwordHash, passwordSalt) VALUES (?,?,?,?,?)")
      .bind(p1Id, coupleId, partner1.name.trim(), p1Hash.hash, p1Hash.salt),
    c.env.DB.prepare("INSERT INTO users (id, coupleId, name, passwordHash, passwordSalt) VALUES (?,?,?,?,?)")
      .bind(p2Id, coupleId, partner2.name.trim(), p2Hash.hash, p2Hash.salt),
  ]);

  await createSession(c.env.DB, c, p1Id);
  return c.json({ coupleId, user: { id: p1Id, name: partner1.name.trim() } }, 201);
});

app.get("/default-couple", async (c) => {
  const row = await c.env.DB.prepare("SELECT id FROM couples ORDER BY createdAt ASC LIMIT 1").first();
  if (!row) return c.json({ error: "No workspace found" }, 404);
  return c.json({ coupleId: row.id });
});

app.get("/couples/:coupleId/auth-status", async (c) => {
  const coupleId = c.req.param("coupleId");
  const { results } = await c.env.DB.prepare("SELECT id, name FROM users WHERE coupleId = ?").bind(coupleId).all();
  if (results.length === 0) return c.json({ error: "Workspace not found" }, 404);
  return c.json({ users: results });
});

app.post("/couples/:coupleId/login", async (c) => {
  const coupleId = c.req.param("coupleId");
  const { userId, password } = await c.req.json();
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ? AND coupleId = ?").bind(userId, coupleId).first();
  if (!user) return c.json({ error: "Incorrect name or password" }, 401);
  const { hash } = await hashPassword(password, user.passwordSalt);
  if (hash !== user.passwordHash) return c.json({ error: "Incorrect name or password" }, 401);
  await createSession(c.env.DB, c, user.id);
  return c.json({ id: user.id, name: user.name });
});

app.post("/auth/logout", async (c) => {
  const token = getCookie(c, "session");
  if (token) await c.env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  deleteCookie(c, "session", { path: "/" });
  return c.body(null, 204);
});

app.get("/auth/me", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Not authenticated" }, 401);
  return c.json(user);
});

// ---------- Clerk accounts ----------
// Linking a Clerk sign-in to a partner in a planner: new couples create their
// wedding here, existing partners claim their account once with their old
// planner password, and the second partner joins through an invite link.

// A password nobody knows, for partners who only ever sign in with Clerk.
async function unusablePassword() {
  return hashPassword(randomToken());
}

// Partner invite codes grant access to a planner, so unlike guest IDs they use
// secure randomness: 10 characters from the short alphabet is about 50 bits.
const INVITE_CODE_LENGTH = 10;

function secureShortId(length) {
  const max = 256 - (256 % SHORT_ID_ALPHABET.length); // reject bytes that would bias the pick
  let id = "";
  while (id.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (byte < max && id.length < length) id += SHORT_ID_ALPHABET[byte % SHORT_ID_ALPHABET.length];
    }
  }
  return id;
}

async function partnerInviteFor(db, coupleId, userId) {
  // Older invites used long tokens; those links keep working, but the link we
  // show is always a short one.
  const existing = await db.prepare("SELECT token FROM partner_invites WHERE coupleId = ? AND userId = ? AND length(token) = ?")
    .bind(coupleId, userId, INVITE_CODE_LENGTH)
    .first();
  if (existing) return existing.token;
  const token = secureShortId(INVITE_CODE_LENGTH);
  await db.prepare("INSERT INTO partner_invites (token, coupleId, userId, createdAt) VALUES (?,?,?,?)")
    .bind(token, coupleId, userId, new Date().toISOString())
    .run();
  return token;
}

app.get("/account/me", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ linked: false });
  return c.json({ linked: true, coupleId: c.get("coupleId"), user });
});

app.post("/account/onboard", async (c) => {
  const clerkUserId = c.get("clerkUserId");
  if (c.get("user")) return c.json({ error: "This account already has a planner" }, 409);
  const { yourName, partnerName, weddingDate } = await c.req.json();
  if (!yourName?.trim() || !partnerName?.trim()) return c.json({ error: "Both names are required" }, 400);
  const db = c.env.DB;
  const coupleId = await generateCoupleSlug(db, yourName.trim(), partnerName.trim());
  const meId = crypto.randomUUID();
  const partnerId = crypto.randomUUID();
  const mePw = await unusablePassword();
  const partnerPw = await unusablePassword();
  await db.batch([
    db.prepare(
      "INSERT INTO couples (id, partner1Name, partner2Name, weddingDate, budgetTotal, notificationsHoldUntil, createdAt) VALUES (?,?,?,?,0,NULL,?)"
    ).bind(coupleId, yourName.trim(), partnerName.trim(), weddingDate || null, new Date().toISOString()),
    db.prepare("INSERT INTO users (id, coupleId, name, passwordHash, passwordSalt, clerkUserId) VALUES (?,?,?,?,?,?)")
      .bind(meId, coupleId, yourName.trim(), mePw.hash, mePw.salt, clerkUserId),
    db.prepare("INSERT INTO users (id, coupleId, name, passwordHash, passwordSalt, clerkUserId) VALUES (?,?,?,?,?,NULL)")
      .bind(partnerId, coupleId, partnerName.trim(), partnerPw.hash, partnerPw.salt),
  ]);
  const inviteToken = await partnerInviteFor(db, coupleId, partnerId);
  return c.json({ coupleId, inviteToken }, 201);
});

app.post("/account/claim", async (c) => {
  const clerkUserId = c.get("clerkUserId");
  if (c.get("user")) return c.json({ error: "This account already has a planner" }, 409);
  const { coupleId, userId, password } = await c.req.json();
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ? AND coupleId = ?").bind(userId, coupleId).first();
  if (!user) return c.json({ error: "Incorrect name or password" }, 401);
  const { hash } = await hashPassword(password || "", user.passwordSalt);
  if (hash !== user.passwordHash) return c.json({ error: "Incorrect name or password" }, 401);
  if (user.clerkUserId) return c.json({ error: "That partner is already linked to another account" }, 409);
  await c.env.DB.prepare("UPDATE users SET clerkUserId = ? WHERE id = ?").bind(clerkUserId, user.id).run();
  return c.json({ coupleId, user: { id: user.id, name: user.name } });
});

// the signed-in partner's link for the other partner (null once they've joined)
app.get("/account/partner-invite", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "No planner yet" }, 404);
  const coupleId = c.get("coupleId");
  const partner = await c.env.DB.prepare("SELECT id, name FROM users WHERE coupleId = ? AND id != ? AND clerkUserId IS NULL")
    .bind(coupleId, user.id)
    .first();
  if (!partner) return c.json({ token: null });
  return c.json({ token: await partnerInviteFor(c.env.DB, coupleId, partner.id), partnerName: partner.name });
});

app.get("/account/invites/:token", async (c) => {
  const invite = await c.env.DB.prepare(
    "SELECT i.coupleId, u.name AS partnerName, u.clerkUserId FROM partner_invites i JOIN users u ON u.id = i.userId WHERE i.token = ?"
  )
    .bind(c.req.param("token"))
    .first();
  if (!invite) return c.json({ error: "This invite link isn't valid" }, 404);
  const couple = await c.env.DB.prepare("SELECT partner1Name, partner2Name FROM couples WHERE id = ?").bind(invite.coupleId).first();
  return c.json({
    coupleId: invite.coupleId,
    partnerName: invite.partnerName,
    names: couple ? [couple.partner1Name, couple.partner2Name] : [],
    used: !!invite.clerkUserId,
  });
});

app.post("/account/invites/:token/accept", async (c) => {
  const clerkUserId = c.get("clerkUserId");
  if (c.get("user")) return c.json({ error: "This account already has a planner" }, 409);
  const invite = await c.env.DB.prepare(
    "SELECT i.coupleId, i.userId, u.clerkUserId FROM partner_invites i JOIN users u ON u.id = i.userId WHERE i.token = ?"
  )
    .bind(c.req.param("token"))
    .first();
  if (!invite) return c.json({ error: "This invite link isn't valid" }, 404);
  if (invite.clerkUserId) return c.json({ error: "This invite has already been used" }, 409);
  await c.env.DB.prepare("UPDATE users SET clerkUserId = ? WHERE id = ?").bind(clerkUserId, invite.userId).run();
  return c.json({ coupleId: invite.coupleId });
});

// ---------- Notifications ----------

app.get("/notifications", async (c) => {
  const user = c.get("user");
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM notifications WHERE userId = ? AND COALESCE(scheduledFor, createdAt) <= ? ORDER BY createdAt DESC LIMIT 50"
  )
    .bind(user.id, new Date().toISOString())
    .all();
  return c.json(results.map((n) => ({ ...n, read: !!n.read })));
});

app.post("/notifications/:id/read", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  await c.env.DB.prepare("UPDATE notifications SET read=1 WHERE id=? AND userId=?").bind(id, user.id).run();
  return c.body(null, 204);
});

app.post("/notifications/read-all", async (c) => {
  const user = c.get("user");
  await c.env.DB.prepare("UPDATE notifications SET read=1 WHERE userId=?").bind(user.id).run();
  return c.body(null, 204);
});

const CURRENCIES = ["SGD", "MYR", "THB", "PHP", "USD", "EUR", "GBP", "JPY", "CNY", "KRW"];
function toCurrency(value) {
  return CURRENCIES.includes(value) ? value : "SGD";
}

// ---------- Settings helper (shared, non-couple-specific exchange rate) ----------

async function getSetting(db, key, fallback) {
  const row = await db.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first();
  return row ? JSON.parse(row.value) : fallback;
}

async function setSetting(db, key, value) {
  await db
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .bind(key, JSON.stringify(value))
    .run();
}

function toPlusCount(value) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// ---------- Wedding date ----------

app.get("/wedding-date", async (c) => {
  const coupleId = c.get("coupleId");
  const couple = await c.env.DB.prepare("SELECT weddingDate FROM couples WHERE id = ?").bind(coupleId).first();
  return c.json({ date: couple?.weddingDate ?? null });
});

app.put("/wedding-date", async (c) => {
  const coupleId = c.get("coupleId");
  const actor = c.get("user");
  const { date } = await c.req.json();
  if (date !== null && !(typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date)))) {
    return c.json({ error: "date must be YYYY-MM-DD or null" }, 400);
  }
  await c.env.DB.prepare("UPDATE couples SET weddingDate = ? WHERE id = ?").bind(date, coupleId).run();
  const message = date
    ? `${actor.name} changed the wedding date to ${new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
        timeZone: "UTC",
        year: "numeric",
        month: "short",
        day: "numeric",
      })}`
    : `${actor.name} cleared the wedding date`;
  await notifyOtherUsers(c.env.DB, coupleId, actor.id, message, "couple", coupleId, "wedding-date");
  return c.json({ date });
});

// ---------- Delete planner ----------

// The phrase Settings asks for before deleting; checked here too so a stray
// request can't wipe a planner.
const DELETE_PLANNER_PHRASE = "yes, i do want to delete";

const COUPLE_TABLES = [
  "notifications",
  "partner_invites",
  "tasks",
  "events",
  "sections",
  "todos",
  "guests",
  "guest_categories",
  "guest_owners",
  "inspiration_items",
  "inspiration_categories",
  "budget_items",
  "budget_categories",
  "vendors",
  "vendor_categories",
];

// The other partner has joined if they've linked an Aislelys account or ever
// signed in with a password (older planners). A partner who left, or was only
// ever invited, has neither.
async function partnerOf(db, coupleId, userId) {
  const partner = await db.prepare("SELECT id, name, clerkUserId FROM users WHERE coupleId = ? AND id != ?")
    .bind(coupleId, userId)
    .first();
  if (!partner) return null;
  const session = partner.clerkUserId
    ? null
    : await db.prepare("SELECT token FROM sessions WHERE userId = ? LIMIT 1").bind(partner.id).first();
  return { id: partner.id, name: partner.name, joined: !!(partner.clerkUserId || session) };
}

// What deleting would do, so Settings can say it before anyone confirms.
app.get("/couple/delete-info", async (c) => {
  const partner = await partnerOf(c.env.DB, c.get("coupleId"), c.get("user").id);
  return c.json({ partnerName: partner?.name ?? null, partnerJoined: !!partner?.joined });
});

// Deleting the planner only removes the partner who asks: while the other
// partner has joined, the planner and everything in it stays with them, and
// the one leaving is signed out and unlinked (their name stays on tasks so
// the plans still read right). With nobody else in it, the whole planner goes.
app.delete("/couple", async (c) => {
  const coupleId = c.get("coupleId");
  const me = c.get("user");
  const { confirm } = await c.req.json().catch(() => ({}));
  if (typeof confirm !== "string" || confirm.trim().toLowerCase() !== DELETE_PLANNER_PHRASE) {
    return c.json({ error: "Type the confirmation phrase to delete the planner" }, 400);
  }
  const db = c.env.DB;
  const partner = await partnerOf(db, coupleId, me.id);
  if (partner?.joined) {
    const pw = await unusablePassword();
    await db.batch([
      db.prepare("DELETE FROM sessions WHERE userId = ?").bind(me.id),
      db.prepare("DELETE FROM notifications WHERE userId = ?").bind(me.id),
      // old invite links for this partner would otherwise work again
      db.prepare("DELETE FROM partner_invites WHERE userId = ?").bind(me.id),
      db.prepare("UPDATE users SET clerkUserId = NULL, passwordHash = ?, passwordSalt = ? WHERE id = ?")
        .bind(pw.hash, pw.salt, me.id),
    ]);
    deleteCookie(c, "session", { path: "/" });
    return c.json({ deleted: "membership" });
  }
  const { results: photos } = await db.prepare("SELECT url FROM inspiration_items WHERE coupleId = ?").bind(coupleId).all();
  await db.batch([
    db.prepare("DELETE FROM sessions WHERE userId IN (SELECT id FROM users WHERE coupleId = ?)").bind(coupleId),
    ...COUPLE_TABLES.map((table) => db.prepare(`DELETE FROM ${table} WHERE coupleId = ?`).bind(coupleId)),
    db.prepare("DELETE FROM users WHERE coupleId = ?").bind(coupleId),
    db.prepare("DELETE FROM couples WHERE id = ?").bind(coupleId),
  ]);
  const photoKeys = photos
    .map((p) => p.url.match(/^https:\/\/images\.saranniankris\.online\/([^/?#]+)$/)?.[1])
    .filter(Boolean);
  if (photoKeys.length) await c.env.IMAGES.delete(photoKeys).catch(() => {}); // rows are gone either way
  deleteCookie(c, "session", { path: "/" });
  return c.json({ deleted: "planner" });
});

// ---------- Image uploads (for inspiration photos taken/picked on mobile) ----------

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

app.post("/upload", async (c) => {
  const body = await c.req.parseBody();
  const file = body.file;
  if (!file || typeof file === "string") return c.json({ error: "file is required" }, 400);
  if (!file.type.startsWith("image/")) return c.json({ error: "only image uploads are supported" }, 400);
  if (file.size > MAX_IMAGE_BYTES) return c.json({ error: "image is too large (max 10MB)" }, 400);

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const key = `${crypto.randomUUID()}.${ext}`;
  await c.env.IMAGES.put(key, file, { httpMetadata: { contentType: file.type } });
  return c.json({ url: `https://images.saranniankris.online/${key}` }, 201);
});

// ---------- Sections ----------

app.get("/sections", async (c) => {
  const coupleId = c.get("coupleId");
  const { results } = await c.env.DB.prepare("SELECT * FROM sections WHERE coupleId = ? ORDER BY position ASC")
    .bind(coupleId)
    .all();
  return c.json(results);
});

app.post("/sections", async (c) => {
  const coupleId = c.get("coupleId");
  const { title, color } = await c.req.json();
  if (!title || !color) return c.json({ error: "title and color are required" }, 400);
  const row = await c.env.DB.prepare("SELECT COALESCE(MAX(position), -1) + 1 AS nextPosition FROM sections WHERE coupleId = ?")
    .bind(coupleId)
    .first();
  const section = { id: crypto.randomUUID(), title, color, position: row.nextPosition };
  await c.env.DB.prepare("INSERT INTO sections (id, coupleId, title, color, position) VALUES (?,?,?,?,?)")
    .bind(section.id, coupleId, section.title, section.color, section.position)
    .run();
  return c.json(section, 201);
});

app.put("/sections/reorder", async (c) => {
  const coupleId = c.get("coupleId");
  const { orderedIds } = await c.req.json();
  if (!Array.isArray(orderedIds)) return c.json({ error: "orderedIds must be an array" }, 400);
  await c.env.DB.batch(
    orderedIds.map((id, index) =>
      c.env.DB.prepare("UPDATE sections SET position = ? WHERE id = ? AND coupleId = ?").bind(index, id, coupleId)
    )
  );
  return c.body(null, 204);
});

app.put("/sections/:id", async (c) => {
  const coupleId = c.get("coupleId");
  const id = c.req.param("id");
  const body = await c.req.json();
  const existing = await c.env.DB.prepare("SELECT * FROM sections WHERE id = ? AND coupleId = ?").bind(id, coupleId).first();
  if (!existing) return c.json({ error: "Section not found" }, 404);
  const title = body.title !== undefined ? body.title : existing.title;
  const color = body.color !== undefined ? body.color : existing.color;
  await c.env.DB.prepare("UPDATE sections SET title = ?, color = ? WHERE id = ?").bind(title, color, id).run();
  return c.json({ id, title, color, position: existing.position });
});

app.delete("/sections/:id", async (c) => {
  const coupleId = c.get("coupleId");
  const id = c.req.param("id");
  const existing = await c.env.DB.prepare("SELECT id FROM sections WHERE id = ? AND coupleId = ?").bind(id, coupleId).first();
  if (!existing) return c.json({ error: "Section not found" }, 404);
  await c.env.DB.prepare("DELETE FROM sections WHERE id = ?").bind(id).run();
  await c.env.DB.prepare("UPDATE events SET sectionId = NULL WHERE sectionId = ?").bind(id).run();
  return c.body(null, 204);
});

// ---------- Events (important dates) + nested tasks ----------

function serializeTask(t) {
  return {
    id: t.id,
    name: t.name,
    assigneeUserId: t.assigneeUserId ?? null,
    createdByUserId: t.createdByUserId ?? null,
    done: !!t.done,
  };
}

app.get("/events", async (c) => {
  const coupleId = c.get("coupleId");
  const { results: events } = await c.env.DB.prepare("SELECT * FROM events WHERE coupleId = ?").bind(coupleId).all();
  const { results: tasks } = await c.env.DB.prepare("SELECT * FROM tasks WHERE coupleId = ?").bind(coupleId).all();
  const byEvent = new Map();
  for (const t of tasks) {
    const list = byEvent.get(t.eventId) ?? [];
    list.push(serializeTask(t));
    byEvent.set(t.eventId, list);
  }
  const full = events.map((e) => ({ ...e, tasks: byEvent.get(e.id) ?? [] }));
  return c.json(full);
});

app.post("/events", async (c) => {
  const coupleId = c.get("coupleId");
  const { title, date, time, sectionId, notes } = await c.req.json();
  if (!title || !date) return c.json({ error: "title and date are required" }, 400);
  const event = {
    id: crypto.randomUUID(),
    title,
    date,
    time: time || "",
    sectionId: sectionId || null,
    notes: notes || "",
    createdAt: new Date().toISOString(),
  };
  await c.env.DB.prepare(
    "INSERT INTO events (id, coupleId, title, date, time, sectionId, notes, createdAt) VALUES (?,?,?,?,?,?,?,?)"
  )
    .bind(event.id, coupleId, event.title, event.date, event.time, event.sectionId, event.notes, event.createdAt)
    .run();
  return c.json({ ...event, tasks: [] }, 201);
});

app.put("/events/:id", async (c) => {
  const coupleId = c.get("coupleId");
  const id = c.req.param("id");
  const body = await c.req.json();
  const existing = await c.env.DB.prepare("SELECT * FROM events WHERE id = ? AND coupleId = ?").bind(id, coupleId).first();
  if (!existing) return c.json({ error: "Event not found" }, 404);
  const title = body.title !== undefined ? body.title : existing.title;
  const date = body.date !== undefined ? body.date : existing.date;
  const time = body.time !== undefined ? body.time : existing.time;
  const sectionId = body.sectionId !== undefined ? body.sectionId : existing.sectionId;
  const notes = body.notes !== undefined ? body.notes : existing.notes;
  await c.env.DB.prepare("UPDATE events SET title=?, date=?, time=?, sectionId=?, notes=? WHERE id=?")
    .bind(title, date, time, sectionId, notes, id)
    .run();
  const { results: tasks } = await c.env.DB.prepare("SELECT * FROM tasks WHERE eventId = ?").bind(id).all();
  return c.json({
    id,
    title,
    date,
    time,
    sectionId,
    notes,
    createdAt: existing.createdAt,
    tasks: tasks.map(serializeTask),
  });
});

app.delete("/events/:id", async (c) => {
  const coupleId = c.get("coupleId");
  const id = c.req.param("id");
  const existing = await c.env.DB.prepare("SELECT id FROM events WHERE id = ? AND coupleId = ?").bind(id, coupleId).first();
  if (!existing) return c.json({ error: "Event not found" }, 404);
  await c.env.DB.prepare("DELETE FROM events WHERE id = ?").bind(id).run();
  await c.env.DB.prepare("DELETE FROM tasks WHERE eventId = ?").bind(id).run();
  return c.body(null, 204);
});

app.post("/events/:id/tasks", async (c) => {
  const coupleId = c.get("coupleId");
  const eventId = c.req.param("id");
  const actor = c.get("user");
  const { name, assigneeUserId } = await c.req.json();
  if (!name) return c.json({ error: "name is required" }, 400);
  const event = await c.env.DB.prepare("SELECT id, title FROM events WHERE id = ? AND coupleId = ?").bind(eventId, coupleId).first();
  if (!event) return c.json({ error: "Event not found" }, 404);
  const task = {
    id: crypto.randomUUID(),
    name,
    assigneeUserId: assigneeUserId || null,
    createdByUserId: actor.id,
    done: false,
  };
  await c.env.DB.prepare(
    "INSERT INTO tasks (id, coupleId, eventId, name, assigneeUserId, createdByUserId, done) VALUES (?,?,?,?,?,?,?)"
  )
    .bind(task.id, coupleId, eventId, task.name, task.assigneeUserId, task.createdByUserId, 0)
    .run();

  let message = `${actor.name} added task "${name}" (${event.title})`;
  if (task.assigneeUserId) {
    const assignee = await c.env.DB.prepare("SELECT name FROM users WHERE id = ? AND coupleId = ?")
      .bind(task.assigneeUserId, coupleId)
      .first();
    if (assignee) message = `${actor.name} added "${name}" and assigned it to ${assignee.name} (${event.title})`;
  }
  await notifyOtherUsers(c.env.DB, coupleId, actor.id, message, "task", task.id, "task-created");

  return c.json(task, 201);
});

app.put("/events/:id/tasks/:taskId", async (c) => {
  const coupleId = c.get("coupleId");
  const { id: eventId, taskId } = c.req.param();
  const actor = c.get("user");
  const body = await c.req.json();
  const existing = await c.env.DB.prepare("SELECT * FROM tasks WHERE id = ? AND eventId = ? AND coupleId = ?")
    .bind(taskId, eventId, coupleId)
    .first();
  if (!existing) return c.json({ error: "Task not found" }, 404);
  const event = await c.env.DB.prepare("SELECT title FROM events WHERE id = ?").bind(eventId).first();
  const name = body.name !== undefined ? body.name : existing.name;
  const assigneeUserId = body.assigneeUserId !== undefined ? body.assigneeUserId : existing.assigneeUserId;
  const done = body.done !== undefined ? Boolean(body.done) : !!existing.done;
  await c.env.DB.prepare("UPDATE tasks SET name=?, assigneeUserId=?, done=? WHERE id=?")
    .bind(name, assigneeUserId, done ? 1 : 0, taskId)
    .run();

  if (body.done !== undefined && done && !existing.done) {
    await notifyOtherUsers(c.env.DB, coupleId, actor.id, `${actor.name} completed "${name}" (${event.title})`, "task", taskId, "task-completed");
  }
  if (body.done !== undefined && !done && existing.done) {
    await cancelPendingNotifications(c.env.DB, taskId, "task-completed");
  }
  if (body.assigneeUserId !== undefined && body.assigneeUserId !== existing.assigneeUserId) {
    await cancelPendingNotifications(c.env.DB, taskId, "task-assigned");
    if (body.assigneeUserId) {
      const assignee = await c.env.DB.prepare("SELECT name FROM users WHERE id = ? AND coupleId = ?")
        .bind(body.assigneeUserId, coupleId)
        .first();
      if (assignee) {
        await notifyOtherUsers(
          c.env.DB,
          coupleId,
          actor.id,
          `${actor.name} assigned "${name}" to ${assignee.name} (${event.title})`,
          "task",
          taskId,
          "task-assigned"
        );
      }
    }
  }

  return c.json({ id: taskId, name, assigneeUserId, createdByUserId: existing.createdByUserId, done });
});

app.delete("/events/:id/tasks/:taskId", async (c) => {
  const coupleId = c.get("coupleId");
  const { taskId } = c.req.param();
  const existing = await c.env.DB.prepare("SELECT id FROM tasks WHERE id = ? AND coupleId = ?").bind(taskId, coupleId).first();
  if (!existing) return c.json({ error: "Task not found" }, 404);
  await c.env.DB.prepare("DELETE FROM tasks WHERE id = ?").bind(taskId).run();
  await cancelPendingNotifications(c.env.DB, taskId);
  return c.body(null, 204);
});

// ---------- Day to-dos ----------

function serializeTodo(t) {
  return {
    id: t.id,
    date: t.date,
    text: t.text,
    assigneeUserId: t.assigneeUserId ?? null,
    createdByUserId: t.createdByUserId ?? null,
    done: !!t.done,
    createdAt: t.createdAt,
  };
}

app.get("/todos", async (c) => {
  const coupleId = c.get("coupleId");
  const { results } = await c.env.DB.prepare("SELECT * FROM todos WHERE coupleId = ? ORDER BY createdAt").bind(coupleId).all();
  return c.json(results.map(serializeTodo));
});

app.post("/todos", async (c) => {
  const coupleId = c.get("coupleId");
  const actor = c.get("user");
  const { date, text, assigneeUserId } = await c.req.json();
  if (!date || !text || !text.trim()) return c.json({ error: "date and text are required" }, 400);
  const todo = {
    id: crypto.randomUUID(),
    date,
    text: text.trim(),
    assigneeUserId: assigneeUserId || null,
    createdByUserId: actor.id,
    done: false,
    createdAt: new Date().toISOString(),
  };
  await c.env.DB.prepare(
    "INSERT INTO todos (id, coupleId, date, text, assigneeUserId, createdByUserId, done, createdAt) VALUES (?,?,?,?,?,?,?,?)"
  )
    .bind(todo.id, coupleId, todo.date, todo.text, todo.assigneeUserId, todo.createdByUserId, 0, todo.createdAt)
    .run();

  let message = `${actor.name} added a to-do "${todo.text}"`;
  if (todo.assigneeUserId) {
    const assignee = await c.env.DB.prepare("SELECT name FROM users WHERE id = ? AND coupleId = ?")
      .bind(todo.assigneeUserId, coupleId)
      .first();
    if (assignee) message = `${actor.name} added "${todo.text}" and assigned it to ${assignee.name}`;
  }
  await notifyOtherUsers(c.env.DB, coupleId, actor.id, message, "todo", todo.id, "todo-created");

  return c.json(todo, 201);
});

app.put("/todos/:id", async (c) => {
  const coupleId = c.get("coupleId");
  const id = c.req.param("id");
  const actor = c.get("user");
  const body = await c.req.json();
  const existing = await c.env.DB.prepare("SELECT * FROM todos WHERE id = ? AND coupleId = ?").bind(id, coupleId).first();
  if (!existing) return c.json({ error: "Todo not found" }, 404);
  const text = body.text !== undefined ? body.text : existing.text;
  const assigneeUserId = body.assigneeUserId !== undefined ? body.assigneeUserId : existing.assigneeUserId;
  const done = body.done !== undefined ? Boolean(body.done) : !!existing.done;
  await c.env.DB.prepare("UPDATE todos SET text=?, assigneeUserId=?, done=? WHERE id=?")
    .bind(text, assigneeUserId, done ? 1 : 0, id)
    .run();

  if (body.done !== undefined && done && !existing.done) {
    await notifyOtherUsers(c.env.DB, coupleId, actor.id, `${actor.name} completed to-do "${text}"`, "todo", id, "todo-completed");
  }
  if (body.done !== undefined && !done && existing.done) {
    await cancelPendingNotifications(c.env.DB, id, "todo-completed");
  }
  if (body.assigneeUserId !== undefined && body.assigneeUserId !== existing.assigneeUserId) {
    await cancelPendingNotifications(c.env.DB, id, "todo-assigned");
    if (body.assigneeUserId) {
      const assignee = await c.env.DB.prepare("SELECT name FROM users WHERE id = ? AND coupleId = ?")
        .bind(body.assigneeUserId, coupleId)
        .first();
      if (assignee) {
        await notifyOtherUsers(c.env.DB, coupleId, actor.id, `${actor.name} assigned "${text}" to ${assignee.name}`, "todo", id, "todo-assigned");
      }
    }
  }

  return c.json({ id, date: existing.date, text, assigneeUserId, createdByUserId: existing.createdByUserId, done, createdAt: existing.createdAt });
});

app.delete("/todos/:id", async (c) => {
  const coupleId = c.get("coupleId");
  const id = c.req.param("id");
  const existing = await c.env.DB.prepare("SELECT id FROM todos WHERE id = ? AND coupleId = ?").bind(id, coupleId).first();
  if (!existing) return c.json({ error: "Todo not found" }, 404);
  await c.env.DB.prepare("DELETE FROM todos WHERE id = ?").bind(id).run();
  await cancelPendingNotifications(c.env.DB, id);
  return c.body(null, 204);
});

// ---------- Guest owners & their guest lists ----------

function serializeGuest(g) {
  return {
    id: g.id,
    name: g.name,
    plusCount: g.plusCount,
    categoryId: g.categoryId,
    isVip: !!g.isVip,
    included: g.included === undefined ? true : !!g.included,
    phone: g.phone ?? "",
    email: g.email ?? "",
    address: g.address ?? "",
    notes: g.notes ?? "",
  };
}

app.get("/guest-owners", async (c) => {
  const coupleId = c.get("coupleId");
  const { results: owners } = await c.env.DB.prepare("SELECT * FROM guest_owners WHERE coupleId = ?").bind(coupleId).all();
  const { results: categories } = await c.env.DB.prepare("SELECT * FROM guest_categories WHERE coupleId = ?").bind(coupleId).all();
  const { results: guests } = await c.env.DB.prepare("SELECT * FROM guests WHERE coupleId = ?").bind(coupleId).all();
  const catsByOwner = new Map();
  for (const cat of categories) {
    const list = catsByOwner.get(cat.ownerId) ?? [];
    list.push({ id: cat.id, ownerId: cat.ownerId, title: cat.title });
    catsByOwner.set(cat.ownerId, list);
  }
  const guestsByOwner = new Map();
  for (const g of guests) {
    const list = guestsByOwner.get(g.ownerId) ?? [];
    list.push(serializeGuest(g));
    guestsByOwner.set(g.ownerId, list);
  }
  return c.json(
    owners.map((o) => ({
      ...o,
      categories: catsByOwner.get(o.id) ?? [],
      guests: guestsByOwner.get(o.id) ?? [],
    }))
  );
});

// PUBLIC (guest invite link) — scoped by the owner's own random id, not by session.
app.get("/guest-owners/:id", async (c) => {
  const id = c.req.param("id");
  const owner = await c.env.DB.prepare("SELECT * FROM guest_owners WHERE id = ?").bind(id).first();
  if (!owner) return c.json({ error: "Guest list not found" }, 404);
  const couple = await c.env.DB.prepare("SELECT partner1Name, partner2Name FROM couples WHERE id = ?")
    .bind(owner.coupleId)
    .first();
  const { results: categories } = await c.env.DB.prepare("SELECT * FROM guest_categories WHERE ownerId = ?").bind(id).all();
  const { results: guests } = await c.env.DB.prepare("SELECT * FROM guests WHERE ownerId = ?").bind(id).all();
  return c.json({
    ...owner,
    partner1Name: couple?.partner1Name ?? null,
    partner2Name: couple?.partner2Name ?? null,
    categories: categories.map((cat) => ({ id: cat.id, ownerId: cat.ownerId, title: cat.title })),
    guests: guests.map(serializeGuest),
  });
});

app.post("/guest-owners", async (c) => {
  const coupleId = c.get("coupleId");
  const { name } = await c.req.json();
  if (!name) return c.json({ error: "name is required" }, 400);
  const ownerId = await generateUniqueShortId(c.env.DB, "guest_owners");
  const owner = { id: ownerId, name, createdAt: new Date().toISOString() };
  await c.env.DB.prepare("INSERT INTO guest_owners (id, coupleId, name, createdAt) VALUES (?,?,?,?)")
    .bind(owner.id, coupleId, owner.name, owner.createdAt)
    .run();
  const defaultCategory = { id: crypto.randomUUID(), ownerId: owner.id, title: "Family" };
  await c.env.DB.prepare("INSERT INTO guest_categories (id, coupleId, ownerId, title) VALUES (?,?,?,?)")
    .bind(defaultCategory.id, coupleId, defaultCategory.ownerId, defaultCategory.title)
    .run();
  return c.json({ ...owner, categories: [defaultCategory], guests: [] }, 201);
});

app.put("/guest-owners/:id", async (c) => {
  const coupleId = c.get("coupleId");
  const id = c.req.param("id");
  const { name } = await c.req.json();
  const existing = await c.env.DB.prepare("SELECT * FROM guest_owners WHERE id = ? AND coupleId = ?").bind(id, coupleId).first();
  if (!existing) return c.json({ error: "Guest list not found" }, 404);
  const newName = name !== undefined ? name : existing.name;
  await c.env.DB.prepare("UPDATE guest_owners SET name=? WHERE id=?").bind(newName, id).run();
  return c.json({ id, name: newName, createdAt: existing.createdAt });
});

app.delete("/guest-owners/:id", async (c) => {
  const coupleId = c.get("coupleId");
  const id = c.req.param("id");
  const existing = await c.env.DB.prepare("SELECT id FROM guest_owners WHERE id = ? AND coupleId = ?").bind(id, coupleId).first();
  if (!existing) return c.json({ error: "Guest list not found" }, 404);
  const { results: ordered } = await c.env.DB.prepare("SELECT id FROM guest_owners WHERE coupleId = ? ORDER BY createdAt ASC")
    .bind(coupleId)
    .all();
  const index = ordered.findIndex((o) => o.id === id);
  if (index !== -1 && index < 2) {
    return c.json({ error: "The Bride and Groom lists can't be deleted" }, 400);
  }
  await c.env.DB.prepare("DELETE FROM guest_owners WHERE id = ?").bind(id).run();
  await c.env.DB.prepare("DELETE FROM guests WHERE ownerId = ?").bind(id).run();
  await c.env.DB.prepare("DELETE FROM guest_categories WHERE ownerId = ?").bind(id).run();
  return c.body(null, 204);
});

// PUBLIC (also reachable from the guest invite link, not just the couple's
// own app) — scoped by the owner's own random id, same model as the guest
// add/edit/delete routes below, since there's no session for a public caller.
app.post("/guest-owners/:id/categories", async (c) => {
  const ownerId = c.req.param("id");
  const { title } = await c.req.json();
  if (!title) return c.json({ error: "title is required" }, 400);
  const owner = await c.env.DB.prepare("SELECT id, coupleId FROM guest_owners WHERE id = ?").bind(ownerId).first();
  if (!owner) return c.json({ error: "Guest list not found" }, 404);
  const category = { id: crypto.randomUUID(), ownerId, title };
  await c.env.DB.prepare("INSERT INTO guest_categories (id, coupleId, ownerId, title) VALUES (?,?,?,?)")
    .bind(category.id, owner.coupleId, category.ownerId, category.title)
    .run();
  return c.json(category, 201);
});

app.put("/guest-owners/:id/categories/:categoryId", async (c) => {
  const coupleId = c.get("coupleId");
  const { id: ownerId, categoryId } = c.req.param();
  const { title } = await c.req.json();
  if (!title || !title.trim()) return c.json({ error: "title is required" }, 400);
  const existing = await c.env.DB.prepare("SELECT id FROM guest_categories WHERE id = ? AND ownerId = ? AND coupleId = ?")
    .bind(categoryId, ownerId, coupleId)
    .first();
  if (!existing) return c.json({ error: "List not found" }, 404);
  await c.env.DB.prepare("UPDATE guest_categories SET title = ? WHERE id = ?").bind(title.trim(), categoryId).run();
  return c.json({ id: categoryId, ownerId, title: title.trim() });
});

app.delete("/guest-owners/:id/categories/:categoryId", async (c) => {
  const coupleId = c.get("coupleId");
  const { id: ownerId, categoryId } = c.req.param();
  const existing = await c.env.DB.prepare("SELECT id FROM guest_categories WHERE id = ? AND ownerId = ? AND coupleId = ?")
    .bind(categoryId, ownerId, coupleId)
    .first();
  if (!existing) return c.json({ error: "List not found" }, 404);
  await c.env.DB.prepare("DELETE FROM guests WHERE categoryId = ?").bind(categoryId).run();
  await c.env.DB.prepare("DELETE FROM guest_categories WHERE id = ?").bind(categoryId).run();
  return c.body(null, 204);
});

// PUBLIC (guest invite link) below — coupleId is derived from the owner row
// itself, never from a session, since these submissions are unauthenticated.
app.post("/guest-owners/:id/guests", async (c) => {
  const ownerId = c.req.param("id");
  const { name, plusCount, categoryId, isVip, phone, email, address, notes } = await c.req.json();
  if (!name) return c.json({ error: "name is required" }, 400);
  const owner = await c.env.DB.prepare("SELECT id, coupleId FROM guest_owners WHERE id = ?").bind(ownerId).first();
  if (!owner) return c.json({ error: "Guest list not found" }, 404);
  const coupleId = owner.coupleId;

  let targetCategoryId = categoryId;
  if (targetCategoryId) {
    const category = await c.env.DB.prepare("SELECT id FROM guest_categories WHERE id = ? AND ownerId = ?")
      .bind(targetCategoryId, ownerId)
      .first();
    if (!category) return c.json({ error: "List not found" }, 404);
  } else {
    // Public invite-link submissions omit categoryId; those always land in a
    // plain "Guests" list (never Family, never VIP), creating it on first use.
    let guestsCategory = await c.env.DB.prepare(
      "SELECT id FROM guest_categories WHERE ownerId = ? AND lower(title) = 'guests'"
    )
      .bind(ownerId)
      .first();
    if (!guestsCategory) {
      const newCategoryId = crypto.randomUUID();
      await c.env.DB.prepare("INSERT INTO guest_categories (id, coupleId, ownerId, title) VALUES (?,?,?,?)")
        .bind(newCategoryId, coupleId, ownerId, "Guests")
        .run();
      guestsCategory = { id: newCategoryId };
    }
    targetCategoryId = guestsCategory.id;
  }

  const guest = {
    id: crypto.randomUUID(),
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
  await c.env.DB.prepare(
    "INSERT INTO guests (id, coupleId, ownerId, name, plusCount, categoryId, isVip, included, phone, email, address, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
  )
    .bind(
      guest.id,
      coupleId,
      ownerId,
      guest.name,
      guest.plusCount,
      guest.categoryId,
      guest.isVip ? 1 : 0,
      1,
      guest.phone,
      guest.email,
      guest.address,
      guest.notes
    )
    .run();
  return c.json(guest, 201);
});

app.put("/guest-owners/:id/guests/:guestId", async (c) => {
  const { id: ownerId, guestId } = c.req.param();
  const body = await c.req.json();
  const existing = await c.env.DB.prepare("SELECT * FROM guests WHERE id = ? AND ownerId = ?")
    .bind(guestId, ownerId)
    .first();
  if (!existing) return c.json({ error: "Guest not found" }, 404);
  const name = body.name !== undefined ? body.name : existing.name;
  const plusCount = body.plusCount !== undefined ? toPlusCount(body.plusCount) : existing.plusCount;
  const isVip = body.isVip !== undefined ? Boolean(body.isVip) : !!existing.isVip;
  const included = body.included !== undefined ? Boolean(body.included) : existing.included === undefined ? true : !!existing.included;
  const phone = body.phone !== undefined ? body.phone : existing.phone ?? "";
  const email = body.email !== undefined ? body.email : existing.email ?? "";
  const address = body.address !== undefined ? body.address : existing.address ?? "";
  const notes = body.notes !== undefined ? body.notes : existing.notes ?? "";
  await c.env.DB.prepare("UPDATE guests SET name=?, plusCount=?, isVip=?, included=?, phone=?, email=?, address=?, notes=? WHERE id=?")
    .bind(name, plusCount, isVip ? 1 : 0, included ? 1 : 0, phone, email, address, notes, guestId)
    .run();
  return c.json({ id: guestId, name, plusCount, categoryId: existing.categoryId, isVip, included, phone, email, address, notes });
});

app.delete("/guest-owners/:id/guests/:guestId", async (c) => {
  const { id: ownerId, guestId } = c.req.param();
  const existing = await c.env.DB.prepare("SELECT id FROM guests WHERE id = ? AND ownerId = ?").bind(guestId, ownerId).first();
  if (!existing) return c.json({ error: "Guest not found" }, 404);
  await c.env.DB.prepare("DELETE FROM guests WHERE id = ?").bind(guestId).run();
  return c.body(null, 204);
});

// ---------- Inspiration board ----------

app.get("/inspiration", async (c) => {
  const coupleId = c.get("coupleId");
  const { results } = await c.env.DB.prepare("SELECT * FROM inspiration_items WHERE coupleId = ? ORDER BY createdAt DESC")
    .bind(coupleId)
    .all();
  return c.json(results.map((i) => ({ ...i, approved: !!i.approved })));
});

app.post("/inspiration", async (c) => {
  const coupleId = c.get("coupleId");
  const { url, caption, categoryId } = await c.req.json();
  if (!url || !url.trim()) return c.json({ error: "url is required" }, 400);
  const item = {
    id: crypto.randomUUID(),
    url: url.trim(),
    caption: caption || "",
    categoryId: categoryId || null,
    approved: false,
    createdAt: new Date().toISOString(),
  };
  await c.env.DB.prepare(
    "INSERT INTO inspiration_items (id,coupleId,url,caption,categoryId,approved,createdAt) VALUES (?,?,?,?,?,?,?)"
  )
    .bind(item.id, coupleId, item.url, item.caption, item.categoryId, 0, item.createdAt)
    .run();
  return c.json(item, 201);
});

app.put("/inspiration/:id", async (c) => {
  const coupleId = c.get("coupleId");
  const id = c.req.param("id");
  const body = await c.req.json();
  const existing = await c.env.DB.prepare("SELECT * FROM inspiration_items WHERE id = ? AND coupleId = ?").bind(id, coupleId).first();
  if (!existing) return c.json({ error: "Inspiration item not found" }, 404);
  const caption = body.caption !== undefined ? body.caption : existing.caption;
  const approved = body.approved !== undefined ? Boolean(body.approved) : !!existing.approved;
  const categoryId = body.categoryId !== undefined ? body.categoryId : existing.categoryId;
  await c.env.DB.prepare("UPDATE inspiration_items SET caption=?, approved=?, categoryId=? WHERE id=?")
    .bind(caption, approved ? 1 : 0, categoryId, id)
    .run();
  return c.json({ ...existing, caption, approved, categoryId });
});

app.delete("/inspiration/:id", async (c) => {
  const coupleId = c.get("coupleId");
  const id = c.req.param("id");
  const existing = await c.env.DB.prepare("SELECT id FROM inspiration_items WHERE id = ? AND coupleId = ?").bind(id, coupleId).first();
  if (!existing) return c.json({ error: "Inspiration item not found" }, 404);
  await c.env.DB.prepare("DELETE FROM inspiration_items WHERE id = ?").bind(id).run();
  return c.body(null, 204);
});

app.get("/inspiration-categories", async (c) => {
  const coupleId = c.get("coupleId");
  const { results } = await c.env.DB.prepare("SELECT * FROM inspiration_categories WHERE coupleId = ?").bind(coupleId).all();
  return c.json(results);
});

app.post("/inspiration-categories", async (c) => {
  const coupleId = c.get("coupleId");
  const { title } = await c.req.json();
  if (!title || !title.trim()) return c.json({ error: "title is required" }, 400);
  const category = { id: crypto.randomUUID(), title: title.trim(), createdAt: new Date().toISOString() };
  await c.env.DB.prepare("INSERT INTO inspiration_categories (id,coupleId,title,createdAt) VALUES (?,?,?,?)")
    .bind(category.id, coupleId, category.title, category.createdAt)
    .run();
  return c.json(category, 201);
});

app.delete("/inspiration-categories/:id", async (c) => {
  const coupleId = c.get("coupleId");
  const id = c.req.param("id");
  const existing = await c.env.DB.prepare("SELECT id FROM inspiration_categories WHERE id = ? AND coupleId = ?").bind(id, coupleId).first();
  if (!existing) return c.json({ error: "Category not found" }, 404);
  await c.env.DB.prepare("DELETE FROM inspiration_categories WHERE id = ?").bind(id).run();
  await c.env.DB.prepare("UPDATE inspiration_items SET categoryId = NULL WHERE categoryId = ?").bind(id).run();
  return c.body(null, 204);
});

// ---------- Link preview resolver ----------

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

app.get("/resolve-preview", async (c) => {
  const url = c.req.query("url");
  if (!url) return c.json({ error: "url is required" }, 400);
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
      if (resolved?.imageUrl) return c.json(resolved);
      return c.json({ error: "Could not resolve a preview image for this link" }, 502);
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
    return c.json({ imageUrl });
  } catch (err) {
    clearTimeout(timeout);
    return c.json({ error: "Could not resolve a preview image for this link" }, 502);
  }
});

// ---------- Budget ----------

app.get("/budget", async (c) => {
  const coupleId = c.get("coupleId");
  const couple = await c.env.DB.prepare("SELECT budgetTotal, savings, homeCurrency FROM couples WHERE id = ?").bind(coupleId).first();
  return c.json({ total: couple?.budgetTotal ?? 0, savings: couple?.savings ?? 0, homeCurrency: toCurrency(couple?.homeCurrency) });
});

app.put("/budget", async (c) => {
  const coupleId = c.get("coupleId");
  const { total, savings, homeCurrency } = await c.req.json();
  const couple = await c.env.DB.prepare("SELECT budgetTotal, savings, homeCurrency FROM couples WHERE id = ?").bind(coupleId).first();
  const newTotal = total !== undefined ? Math.max(0, Number(total) || 0) : couple?.budgetTotal ?? 0;
  const newSavings = savings !== undefined ? Math.max(0, Number(savings) || 0) : couple?.savings ?? 0;
  const newHomeCurrency = homeCurrency !== undefined ? toCurrency(homeCurrency) : toCurrency(couple?.homeCurrency);
  await c.env.DB.prepare("UPDATE couples SET budgetTotal = ?, savings = ?, homeCurrency = ? WHERE id = ?")
    .bind(newTotal, newSavings, newHomeCurrency, coupleId)
    .run();
  return c.json({ total: newTotal, savings: newSavings, homeCurrency: newHomeCurrency });
});

app.get("/budget-items", async (c) => {
  const coupleId = c.get("coupleId");
  // vendor-linked lines also carry the vendor's downpayment, and share the vendor's notes
  const { results } = await c.env.DB.prepare(
    `SELECT b.*, v.downpayment AS downpayment, COALESCE(v.notes, b.notes) AS notes,
       COALESCE(v.extras, b.extras) AS extras
     FROM budget_items b LEFT JOIN vendors v ON v.id = b.sourceVendorId AND v.coupleId = b.coupleId
     WHERE b.coupleId = ? ORDER BY b.createdAt DESC`
  )
    .bind(coupleId)
    .all();
  return c.json(
    results.map(({ downpayment, ...b }) => ({
      ...b,
      paid: !!b.paid,
      extras: parseExtras(b.extras),
      ...(b.sourceVendorId && downpayment !== null ? { downpayment } : {}),
    }))
  );
});

// Extra costs on top of a vendor's / expense's base cost, stored as a JSON
// array of {id, label, amount}. Anything malformed is dropped.
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

function parseExtras(json) {
  try {
    return sanitizeExtras(JSON.parse(json || "[]"));
  } catch {
    return [];
  }
}

// Budget-only category for day-to-day spending: its lines never become vendors,
// and it's never mirrored into the vendor categories.
const PURCHASES_CATEGORY = "Purchases";

// A new expense added on the Budget page also becomes a vendor (Booked, or
// Paid if ticked), linked the same way as a vendor's own budget line —
// unless it's filed under Purchases.
app.post("/budget-items", async (c) => {
  const coupleId = c.get("coupleId");
  const { item, category, estimated, actual, paid, currency, notes, extras } = await c.req.json();
  if (!item || !item.trim()) return c.json({ error: "item is required" }, 400);
  const row = {
    id: crypto.randomUUID(),
    item: item.trim(),
    category: category || PURCHASES_CATEGORY,
    currency: toCurrency(currency),
    estimated: Math.max(0, Number(estimated) || 0),
    actual: Math.max(0, Number(actual) || 0),
    paid: Boolean(paid),
    createdAt: new Date().toISOString(),
    sourceVendorId: null,
    notes: typeof notes === "string" ? notes : "",
    extras: sanitizeExtras(extras),
  };
  await ensureCategory(c.env.DB, coupleId, "budget", row.category);

  if (row.category !== PURCHASES_CATEGORY) {
    const vendorId = crypto.randomUUID();
    await ensureCategory(c.env.DB, coupleId, "vendor", row.category);
    await c.env.DB.prepare(
      "INSERT INTO vendors (id,coupleId,name,category,contact,cost,status,notes,createdAt,currency,budgetCategory,downpayment,extras) VALUES (?,?,?,?,?,?,?,?,?,?,?,0,?)"
    )
      .bind(
        vendorId,
        coupleId,
        row.item,
        row.category,
        "",
        row.actual || row.estimated,
        row.paid ? "paid" : "booked",
        row.notes,
        row.createdAt,
        row.currency,
        row.category,
        JSON.stringify(row.extras)
      )
      .run();
    row.sourceVendorId = vendorId;
    row.downpayment = 0;
  }

  await c.env.DB.prepare(
    "INSERT INTO budget_items (id,coupleId,item,category,currency,estimated,actual,paid,createdAt,sourceVendorId,notes,extras) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
  )
    .bind(
      row.id,
      coupleId,
      row.item,
      row.category,
      row.currency,
      row.estimated,
      row.actual,
      row.paid ? 1 : 0,
      row.createdAt,
      row.sourceVendorId,
      row.sourceVendorId ? "" : row.notes,
      row.sourceVendorId ? "[]" : JSON.stringify(row.extras)
    )
    .run();
  return c.json(row, 201);
});

app.put("/budget-items/:id", async (c) => {
  const coupleId = c.get("coupleId");
  const actor = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const existing = await c.env.DB.prepare("SELECT * FROM budget_items WHERE id = ? AND coupleId = ?").bind(id, coupleId).first();
  if (!existing) return c.json({ error: "Budget item not found" }, 404);
  const item = body.item !== undefined ? body.item : existing.item;
  const category = body.category !== undefined ? body.category : existing.category;
  const currency = body.currency !== undefined ? toCurrency(body.currency) : existing.currency;
  const estimated = body.estimated !== undefined ? Math.max(0, Number(body.estimated) || 0) : existing.estimated;
  const actual = body.actual !== undefined ? Math.max(0, Number(body.actual) || 0) : existing.actual;
  const paid = body.paid !== undefined ? Boolean(body.paid) : !!existing.paid;
  await c.env.DB.prepare("UPDATE budget_items SET item=?,category=?,currency=?,estimated=?,actual=?,paid=? WHERE id=?")
    .bind(item, category, currency, estimated, actual, paid ? 1 : 0, id)
    .run();
  if (existing.sourceVendorId) {
    await syncBudgetItemToVendor(c.env.DB, coupleId, existing.sourceVendorId, { item, category, currency, actual, paid });
    if (body.downpayment !== undefined) {
      await c.env.DB.prepare("UPDATE vendors SET downpayment = ? WHERE id = ? AND coupleId = ?")
        .bind(Math.max(0, Number(body.downpayment) || 0), existing.sourceVendorId, coupleId)
        .run();
    }
    if (typeof body.notes === "string") {
      await c.env.DB.prepare("UPDATE vendors SET notes = ? WHERE id = ? AND coupleId = ?")
        .bind(body.notes, existing.sourceVendorId, coupleId)
        .run();
    }
    if (body.extras !== undefined) {
      await c.env.DB.prepare("UPDATE vendors SET extras = ? WHERE id = ? AND coupleId = ?")
        .bind(JSON.stringify(sanitizeExtras(body.extras)), existing.sourceVendorId, coupleId)
        .run();
    }
  } else {
    if (typeof body.notes === "string") {
      await c.env.DB.prepare("UPDATE budget_items SET notes = ? WHERE id = ?").bind(body.notes, id).run();
    }
    if (body.extras !== undefined) {
      await c.env.DB.prepare("UPDATE budget_items SET extras = ? WHERE id = ?")
        .bind(JSON.stringify(sanitizeExtras(body.extras)), id)
        .run();
    }
  }

  if (body.paid !== undefined && paid !== !!existing.paid) {
    if (paid) {
      await cancelPendingNotifications(c.env.DB, id, "budget-unpaid");
      await notifyOtherUsers(c.env.DB, coupleId, actor.id, `${actor.name} marked "${item}" as paid`, "budget", id, "budget-paid");
    } else {
      await cancelPendingNotifications(c.env.DB, id, "budget-paid");
      await notifyOtherUsers(c.env.DB, coupleId, actor.id, `${actor.name} marked "${item}" as unpaid`, "budget", id, "budget-unpaid");
    }
  }

  return c.json({ id, item, category, currency, estimated, actual, paid, createdAt: existing.createdAt });
});

// The Budget-page half of the vendor <-> budget link (see syncVendorBudgetLink):
// a vendor-linked line's name, category, currency, actual and paid status are
// written back to the vendor. Unticking paid moves a Paid vendor back to
// Booked, so it stays on the budget.
async function syncBudgetItemToVendor(db, coupleId, vendorId, line) {
  const vendor = await db.prepare("SELECT status FROM vendors WHERE id = ? AND coupleId = ?").bind(vendorId, coupleId).first();
  if (!vendor) return;
  const status = line.paid ? "paid" : vendor.status === "paid" ? "booked" : vendor.status;
  await ensureCategory(db, coupleId, "vendor", line.category);
  await db
    .prepare("UPDATE vendors SET name=?, category=?, budgetCategory=?, currency=?, cost=?, status=? WHERE id=?")
    .bind(line.item, line.category, line.category, line.currency, line.actual, status, vendorId)
    .run();
}

app.delete("/budget-items/:id", async (c) => {
  const coupleId = c.get("coupleId");
  const id = c.req.param("id");
  const existing = await c.env.DB.prepare("SELECT id, sourceVendorId FROM budget_items WHERE id = ? AND coupleId = ?")
    .bind(id, coupleId)
    .first();
  if (!existing) return c.json({ error: "Budget item not found" }, 404);
  await c.env.DB.prepare("DELETE FROM budget_items WHERE id = ?").bind(id).run();
  // removing a vendor's line from the budget keeps the vendor, back at Inquired
  if (existing.sourceVendorId) {
    await c.env.DB.prepare("UPDATE vendors SET status = 'inquired' WHERE id = ? AND coupleId = ?")
      .bind(existing.sourceVendorId, coupleId)
      .run();
  }
  await cancelPendingNotifications(c.env.DB, id);
  return c.body(null, 204);
});

// ---------- Budget categories ----------

app.get("/budget-categories", async (c) => {
  const coupleId = c.get("coupleId");
  const { results } = await c.env.DB.prepare("SELECT * FROM budget_categories WHERE coupleId = ?").bind(coupleId).all();
  return c.json(results);
});

app.post("/budget-categories", async (c) => {
  const coupleId = c.get("coupleId");
  const { title, color } = await c.req.json();
  if (!title || !title.trim()) return c.json({ error: "title is required" }, 400);
  const category = {
    id: crypto.randomUUID(),
    title: title.trim(),
    color: color || "#7C9885",
    createdAt: new Date().toISOString(),
  };
  await c.env.DB.prepare("INSERT INTO budget_categories (id,coupleId,title,color,createdAt) VALUES (?,?,?,?,?)")
    .bind(category.id, coupleId, category.title, category.color, category.createdAt)
    .run();
  return c.json(category, 201);
});

app.put("/budget-categories/:id", async (c) => {
  const coupleId = c.get("coupleId");
  const id = c.req.param("id");
  const body = await c.req.json();
  const existing = await c.env.DB.prepare("SELECT * FROM budget_categories WHERE id = ? AND coupleId = ?").bind(id, coupleId).first();
  if (!existing) return c.json({ error: "Category not found" }, 404);
  const title = body.title !== undefined ? body.title : existing.title;
  const color = body.color !== undefined ? body.color : existing.color;
  await c.env.DB.prepare("UPDATE budget_categories SET title=?, color=? WHERE id=?").bind(title, color, id).run();
  return c.json({ id, title, color, createdAt: existing.createdAt });
});

app.delete("/budget-categories/:id", async (c) => {
  const coupleId = c.get("coupleId");
  const id = c.req.param("id");
  const existing = await c.env.DB.prepare("SELECT id FROM budget_categories WHERE id = ? AND coupleId = ?").bind(id, coupleId).first();
  if (!existing) return c.json({ error: "Category not found" }, 404);
  await c.env.DB.prepare("DELETE FROM budget_categories WHERE id = ?").bind(id).run();
  return c.body(null, 204);
});

// ---------- Exchange rate (MYR -> SGD) — shared across all couples ----------

const FOREIGN_CURRENCIES = CURRENCIES.filter((cur) => cur !== "SGD");
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

// Older stored settings only have { myrToSgd }: normalize on read so a
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

app.get("/exchange-rate", async (c) => {
  const rate = await getSetting(c.env.DB, "exchangeRate", { base: "SGD", rates: DEFAULT_RATES, updatedAt: null, source: "default" });
  return c.json(normalizedExchangeRate(rate));
});

app.post("/exchange-rate/refresh", async (c) => {
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
    const exchangeRate = {
      base: "SGD",
      rates,
      updatedAt: new Date().toISOString(),
      source: "frankfurter.app (ECB reference rates)",
    };
    await setSetting(c.env.DB, "exchangeRate", exchangeRate);
    return c.json(exchangeRate);
  } catch (err) {
    return c.json({ error: "Could not fetch live rates right now. You can enter them manually below." }, 502);
  }
});

app.put("/exchange-rate", async (c) => {
  const { rates: patch } = await c.req.json();
  if (!patch || typeof patch !== "object") return c.json({ error: "rates must be an object of currency -> SGD value" }, 400);
  const current = normalizedExchangeRate(await getSetting(c.env.DB, "exchangeRate", { base: "SGD", rates: DEFAULT_RATES }));
  const rates = { ...current.rates };
  for (const currency of FOREIGN_CURRENCIES) {
    if (patch[currency] === undefined) continue;
    if (!(Number(patch[currency]) > 0)) return c.json({ error: `${currency} rate must be a positive number` }, 400);
    rates[currency] = Number(patch[currency]);
  }
  const exchangeRate = { base: "SGD", rates, updatedAt: new Date().toISOString(), source: "manual" };
  await setSetting(c.env.DB, "exchangeRate", exchangeRate);
  return c.json(exchangeRate);
});

// ---------- Vendor categories ----------

app.get("/vendor-categories", async (c) => {
  const coupleId = c.get("coupleId");
  const { results } = await c.env.DB.prepare("SELECT * FROM vendor_categories WHERE coupleId = ?").bind(coupleId).all();
  return c.json(results);
});

app.post("/vendor-categories", async (c) => {
  const coupleId = c.get("coupleId");
  const { title, color } = await c.req.json();
  if (!title || !title.trim()) return c.json({ error: "title is required" }, 400);
  const category = {
    id: crypto.randomUUID(),
    title: title.trim(),
    color: color || "#7C9885",
    createdAt: new Date().toISOString(),
  };
  await c.env.DB.prepare("INSERT INTO vendor_categories (id,coupleId,title,color,createdAt) VALUES (?,?,?,?,?)")
    .bind(category.id, coupleId, category.title, category.color, category.createdAt)
    .run();
  return c.json(category, 201);
});

app.put("/vendor-categories/:id", async (c) => {
  const coupleId = c.get("coupleId");
  const id = c.req.param("id");
  const body = await c.req.json();
  const existing = await c.env.DB.prepare("SELECT * FROM vendor_categories WHERE id = ? AND coupleId = ?").bind(id, coupleId).first();
  if (!existing) return c.json({ error: "Category not found" }, 404);
  const title = body.title !== undefined ? body.title : existing.title;
  const color = body.color !== undefined ? body.color : existing.color;
  await c.env.DB.prepare("UPDATE vendor_categories SET title=?, color=? WHERE id=?").bind(title, color, id).run();
  return c.json({ id, title, color, createdAt: existing.createdAt });
});

app.delete("/vendor-categories/:id", async (c) => {
  const coupleId = c.get("coupleId");
  const id = c.req.param("id");
  const existing = await c.env.DB.prepare("SELECT id FROM vendor_categories WHERE id = ? AND coupleId = ?").bind(id, coupleId).first();
  if (!existing) return c.json({ error: "Category not found" }, 404);
  await c.env.DB.prepare("DELETE FROM vendor_categories WHERE id = ?").bind(id).run();
  return c.body(null, 204);
});

// ---------- Vendors ----------

app.get("/vendors", async (c) => {
  const coupleId = c.get("coupleId");
  const { results } = await c.env.DB.prepare("SELECT * FROM vendors WHERE coupleId = ? ORDER BY createdAt DESC").bind(coupleId).all();
  return c.json(results.map((v) => ({ ...v, extras: parseExtras(v.extras) })));
});

app.post("/vendors", async (c) => {
  const coupleId = c.get("coupleId");
  const { name, category, contact, cost, status, notes, currency, downpayment, extras } = await c.req.json();
  if (!name || !name.trim()) return c.json({ error: "name is required" }, 400);
  const vendor = {
    id: crypto.randomUUID(),
    name: name.trim(),
    category: category || "",
    contact: contact || "",
    cost: Math.max(0, Number(cost) || 0),
    status: status || "inquired",
    notes: notes || "",
    createdAt: new Date().toISOString(),
    currency: toCurrency(currency),
    budgetCategory: category || "",
    downpayment: Math.max(0, Number(downpayment) || 0),
    extras: sanitizeExtras(extras),
  };
  await c.env.DB.prepare(
    "INSERT INTO vendors (id,coupleId,name,category,contact,cost,status,notes,createdAt,currency,budgetCategory,downpayment,extras) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)"
  )
    .bind(
      vendor.id,
      coupleId,
      vendor.name,
      vendor.category,
      vendor.contact,
      vendor.cost,
      vendor.status,
      vendor.notes,
      vendor.createdAt,
      vendor.currency,
      vendor.budgetCategory,
      vendor.downpayment,
      JSON.stringify(vendor.extras)
    )
    .run();
  await syncVendorBudgetLink(c.env.DB, coupleId, null, vendor);
  return c.json(vendor, 201);
});

// A vendor sits on the budget once it has a Downpayment (or is Booked or Paid), as a budget line
// linked back to it (sourceVendorId): name, category, currency, cost
// (the line's "actual") and paid status all mirror the vendor. The line's
// "estimated" starts at the cost and keeps following it, unless it's been set
// to something different on the Budget page. Going back to Inquired removes
// the line, and deleting the line on the Budget page sets the vendor back to
// Inquired (the vendor itself is kept).
// Edits made on the Budget page flow back via syncBudgetItemToVendor.
const VENDOR_BUDGET_STATUSES = new Set(["downpayment", "booked", "paid"]);

// Vendor and budget categories are kept as one matching list: whenever a
// vendor's category is used on the budget (or a budget line's category comes
// back to a vendor), make sure the other side has a category of that name,
// borrowing the colour from the side that already has it.
const CATEGORY_TABLES = { budget: "budget_categories", vendor: "vendor_categories" };

async function ensureCategory(db, coupleId, side, title) {
  if (!title) return;
  if (side === "vendor" && title === PURCHASES_CATEGORY) return;
  const table = CATEGORY_TABLES[side];
  const otherTable = CATEGORY_TABLES[side === "budget" ? "vendor" : "budget"];
  const exists = await db.prepare(`SELECT id FROM ${table} WHERE coupleId = ? AND title = ?`).bind(coupleId, title).first();
  if (exists) return;
  const other = await db.prepare(`SELECT color FROM ${otherTable} WHERE coupleId = ? AND title = ?`).bind(coupleId, title).first();
  await db
    .prepare(`INSERT INTO ${table} (id,coupleId,title,color,createdAt) VALUES (?,?,?,?,?)`)
    .bind(crypto.randomUUID(), coupleId, title, other?.color || "#7C9885", new Date().toISOString())
    .run();
}

async function syncVendorBudgetLink(db, coupleId, before, after) {
  const wasInBudget = !!before && VENDOR_BUDGET_STATUSES.has(before.status);
  const isInBudget = VENDOR_BUDGET_STATUSES.has(after.status);
  const linked = await db
    .prepare("SELECT * FROM budget_items WHERE sourceVendorId = ? AND coupleId = ?")
    .bind(after.id, coupleId)
    .first();
  const paid = after.status === "paid" ? 1 : 0;

  if (!isInBudget) {
    if (linked) await db.prepare("DELETE FROM budget_items WHERE id = ?").bind(linked.id).run();
    return;
  }
  if (linked || !wasInBudget) await ensureCategory(db, coupleId, "budget", after.category);

  if (linked) {
    const estimated = before && linked.estimated !== before.cost ? linked.estimated : after.cost;
    await db
      .prepare("UPDATE budget_items SET item=?, category=?, currency=?, estimated=?, actual=?, paid=? WHERE id=?")
      .bind(after.name, after.category, after.currency, estimated, after.cost, paid, linked.id)
      .run();
  } else if (!wasInBudget) {
    await db
      .prepare(
        "INSERT INTO budget_items (id,coupleId,item,category,currency,estimated,actual,paid,createdAt,sourceVendorId) VALUES (?,?,?,?,?,?,?,?,?,?)"
      )
      .bind(
        crypto.randomUUID(),
        coupleId,
        after.name,
        after.category,
        after.currency,
        after.cost,
        after.cost,
        paid,
        new Date().toISOString(),
        after.id
      )
      .run();
  }
}

app.put("/vendors/:id", async (c) => {
  const coupleId = c.get("coupleId");
  const id = c.req.param("id");
  const body = await c.req.json();
  const existing = await c.env.DB.prepare("SELECT * FROM vendors WHERE id = ? AND coupleId = ?").bind(id, coupleId).first();
  if (!existing) return c.json({ error: "Vendor not found" }, 404);
  const vendor = {
    id,
    name: body.name !== undefined ? body.name : existing.name,
    category: body.category !== undefined ? body.category : existing.category,
    contact: body.contact !== undefined ? body.contact : existing.contact,
    cost: body.cost !== undefined ? Math.max(0, Number(body.cost) || 0) : existing.cost,
    status: body.status !== undefined ? body.status : existing.status,
    notes: body.notes !== undefined ? body.notes : existing.notes,
    createdAt: existing.createdAt,
    currency: body.currency !== undefined ? toCurrency(body.currency) : existing.currency,
    downpayment: body.downpayment !== undefined ? Math.max(0, Number(body.downpayment) || 0) : existing.downpayment,
    extras: body.extras !== undefined ? sanitizeExtras(body.extras) : parseExtras(existing.extras),
  };
  vendor.budgetCategory = vendor.category;
  await c.env.DB.prepare(
    "UPDATE vendors SET name=?,category=?,contact=?,cost=?,status=?,notes=?,currency=?,budgetCategory=?,downpayment=?,extras=? WHERE id=?"
  )
    .bind(
      vendor.name,
      vendor.category,
      vendor.contact,
      vendor.cost,
      vendor.status,
      vendor.notes,
      vendor.currency,
      vendor.budgetCategory,
      vendor.downpayment,
      JSON.stringify(vendor.extras),
      id
    )
    .run();
  await syncVendorBudgetLink(c.env.DB, coupleId, existing, vendor);
  return c.json(vendor);
});

app.delete("/vendors/:id", async (c) => {
  const coupleId = c.get("coupleId");
  const id = c.req.param("id");
  const existing = await c.env.DB.prepare("SELECT id FROM vendors WHERE id = ? AND coupleId = ?").bind(id, coupleId).first();
  if (!existing) return c.json({ error: "Vendor not found" }, 404);
  await c.env.DB.prepare("DELETE FROM vendors WHERE id = ?").bind(id).run();
  await c.env.DB.prepare("DELETE FROM budget_items WHERE sourceVendorId = ?").bind(id).run();
  return c.body(null, 204);
});

export const onRequest = handle(app);
