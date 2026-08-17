import express from "express";
import cors from "cors";
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

// ---------- Wedding date (for the countdown subheader) ----------

app.get("/api/wedding-date", async (req, res) => {
  const data = await readData();
  res.json({ date: data.weddingDate });
});

// ---------- Sections ----------

app.get("/api/sections", async (req, res) => {
  const data = await readData();
  res.json(data.sections);
});

app.post("/api/sections", async (req, res) => {
  const { title, color } = req.body;
  if (!title || !color) {
    return res.status(400).json({ error: "title and color are required" });
  }
  const data = await readData();
  const section = { id: uuid(), title, color };
  data.sections.push(section);
  await writeData(data);
  res.status(201).json(section);
});

app.put("/api/sections/:id", async (req, res) => {
  const { title, color } = req.body;
  const data = await readData();
  const section = data.sections.find((s) => s.id === req.params.id);
  if (!section) return res.status(404).json({ error: "Section not found" });
  if (title !== undefined) section.title = title;
  if (color !== undefined) section.color = color;
  await writeData(data);
  res.json(section);
});

app.delete("/api/sections/:id", async (req, res) => {
  const data = await readData();
  const exists = data.sections.some((s) => s.id === req.params.id);
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
  res.json(data.events);
});

app.post("/api/events", async (req, res) => {
  const { title, date, time, sectionId, notes } = req.body;
  if (!title || !date) {
    return res.status(400).json({ error: "title and date are required" });
  }
  const data = await readData();
  const event = {
    id: uuid(),
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
  const event = data.events.find((e) => e.id === req.params.id);
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
  const exists = data.events.some((e) => e.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Event not found" });
  data.events = data.events.filter((e) => e.id !== req.params.id);
  await writeData(data);
  res.status(204).end();
});

// ---------- Tasks (nested in events) ----------

app.post("/api/events/:id/tasks", async (req, res) => {
  const { name, assignee } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  const data = await readData();
  const event = data.events.find((e) => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found" });
  const task = { id: uuid(), name, assignee: assignee || "", done: false };
  event.tasks.push(task);
  await writeData(data);
  res.status(201).json(task);
});

app.put("/api/events/:id/tasks/:taskId", async (req, res) => {
  const { name, assignee, done } = req.body;
  const data = await readData();
  const event = data.events.find((e) => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found" });
  const task = event.tasks.find((t) => t.id === req.params.taskId);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (name !== undefined) task.name = name;
  if (assignee !== undefined) task.assignee = assignee;
  if (done !== undefined) task.done = done;
  await writeData(data);
  res.json(task);
});

app.delete("/api/events/:id/tasks/:taskId", async (req, res) => {
  const data = await readData();
  const event = data.events.find((e) => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found" });
  event.tasks = event.tasks.filter((t) => t.id !== req.params.taskId);
  await writeData(data);
  res.status(204).end();
});

// ---------- Day to-dos (per calendar date) ----------

app.get("/api/todos", async (req, res) => {
  const data = await readData();
  res.json(data.todos);
});

app.post("/api/todos", async (req, res) => {
  const { date, text } = req.body;
  if (!date || !text || !text.trim()) {
    return res.status(400).json({ error: "date and text are required" });
  }
  const data = await readData();
  const todo = { id: uuid(), date, text: text.trim(), done: false, createdAt: new Date().toISOString() };
  data.todos.push(todo);
  await writeData(data);
  res.status(201).json(todo);
});

app.put("/api/todos/:id", async (req, res) => {
  const { text, done } = req.body;
  const data = await readData();
  const todo = data.todos.find((t) => t.id === req.params.id);
  if (!todo) return res.status(404).json({ error: "Todo not found" });
  if (text !== undefined) todo.text = text;
  if (done !== undefined) todo.done = done;
  await writeData(data);
  res.json(todo);
});

app.delete("/api/todos/:id", async (req, res) => {
  const data = await readData();
  const exists = data.todos.some((t) => t.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Todo not found" });
  data.todos = data.todos.filter((t) => t.id !== req.params.id);
  await writeData(data);
  res.status(204).end();
});

// ---------- Guest owners & their guest lists ----------

app.get("/api/guest-owners", async (req, res) => {
  const data = await readData();
  res.json(data.guestOwners);
});

app.get("/api/guest-owners/:id", async (req, res) => {
  const data = await readData();
  const owner = data.guestOwners.find((o) => o.id === req.params.id);
  if (!owner) return res.status(404).json({ error: "Guest list not found" });
  res.json(owner);
});

app.post("/api/guest-owners", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  const data = await readData();
  const owner = { id: uuid(), name, guests: [], createdAt: new Date().toISOString() };
  data.guestOwners.push(owner);
  await writeData(data);
  res.status(201).json(owner);
});

app.put("/api/guest-owners/:id", async (req, res) => {
  const { name } = req.body;
  const data = await readData();
  const owner = data.guestOwners.find((o) => o.id === req.params.id);
  if (!owner) return res.status(404).json({ error: "Guest list not found" });
  if (name !== undefined) owner.name = name;
  await writeData(data);
  res.json(owner);
});

app.delete("/api/guest-owners/:id", async (req, res) => {
  const data = await readData();
  const exists = data.guestOwners.some((o) => o.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Guest list not found" });
  data.guestOwners = data.guestOwners.filter((o) => o.id !== req.params.id);
  await writeData(data);
  res.status(204).end();
});

function toPlusCount(value) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

app.post("/api/guest-owners/:id/guests", async (req, res) => {
  const { name, plusCount } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  const data = await readData();
  const owner = data.guestOwners.find((o) => o.id === req.params.id);
  if (!owner) return res.status(404).json({ error: "Guest list not found" });
  const guest = { id: uuid(), name, plusCount: toPlusCount(plusCount) };
  owner.guests.push(guest);
  await writeData(data);
  res.status(201).json(guest);
});

app.put("/api/guest-owners/:id/guests/:guestId", async (req, res) => {
  const { name, plusCount } = req.body;
  const data = await readData();
  const owner = data.guestOwners.find((o) => o.id === req.params.id);
  if (!owner) return res.status(404).json({ error: "Guest list not found" });
  const guest = owner.guests.find((g) => g.id === req.params.guestId);
  if (!guest) return res.status(404).json({ error: "Guest not found" });
  if (name !== undefined) guest.name = name;
  if (plusCount !== undefined) guest.plusCount = toPlusCount(plusCount);
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
  const sorted = [...data.inspirationItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
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
  const item = data.inspirationItems.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Inspiration item not found" });
  if (caption !== undefined) item.caption = caption;
  if (approved !== undefined) item.approved = approved;
  if (categoryId !== undefined) item.categoryId = categoryId;
  await writeData(data);
  res.json(item);
});

app.delete("/api/inspiration/:id", async (req, res) => {
  const data = await readData();
  const exists = data.inspirationItems.some((i) => i.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Inspiration item not found" });
  data.inspirationItems = data.inspirationItems.filter((i) => i.id !== req.params.id);
  await writeData(data);
  res.status(204).end();
});

// ---------- Inspiration categories ----------

app.get("/api/inspiration-categories", async (req, res) => {
  const data = await readData();
  res.json(data.inspirationCategories);
});

app.post("/api/inspiration-categories", async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "title is required" });
  }
  const data = await readData();
  const category = { id: uuid(), title: title.trim(), createdAt: new Date().toISOString() };
  data.inspirationCategories.push(category);
  await writeData(data);
  res.status(201).json(category);
});

app.delete("/api/inspiration-categories/:id", async (req, res) => {
  const data = await readData();
  const exists = data.inspirationCategories.some((c) => c.id === req.params.id);
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

app.get("/api/resolve-preview", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "url is required" });
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
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
    res.status(502).json({ error: "Could not resolve a preview image for this link" });
  }
});

// ---------- Budget ----------

app.get("/api/budget", async (req, res) => {
  const data = await readData();
  res.json(data.budget);
});

app.put("/api/budget", async (req, res) => {
  const { total } = req.body;
  const data = await readData();
  if (total !== undefined) data.budget.total = Math.max(0, Number(total) || 0);
  await writeData(data);
  res.json(data.budget);
});

app.get("/api/budget-items", async (req, res) => {
  const data = await readData();
  res.json(data.budgetItems);
});

app.post("/api/budget-items", async (req, res) => {
  const { item, category, estimated, actual, paid, currency } = req.body;
  if (!item || !item.trim()) {
    return res.status(400).json({ error: "item is required" });
  }
  const data = await readData();
  const budgetItem = {
    id: uuid(),
    item: item.trim(),
    category: category || "Other",
    currency: currency === "MYR" ? "MYR" : "SGD",
    estimated: Math.max(0, Number(estimated) || 0),
    actual: Math.max(0, Number(actual) || 0),
    paid: Boolean(paid),
    createdAt: new Date().toISOString(),
  };
  data.budgetItems.push(budgetItem);
  await writeData(data);
  res.status(201).json(budgetItem);
});

app.put("/api/budget-items/:id", async (req, res) => {
  const { item, category, estimated, actual, paid, currency } = req.body;
  const data = await readData();
  const budgetItem = data.budgetItems.find((b) => b.id === req.params.id);
  if (!budgetItem) return res.status(404).json({ error: "Budget item not found" });
  if (item !== undefined) budgetItem.item = item;
  if (category !== undefined) budgetItem.category = category;
  if (currency !== undefined) budgetItem.currency = currency === "MYR" ? "MYR" : "SGD";
  if (estimated !== undefined) budgetItem.estimated = Math.max(0, Number(estimated) || 0);
  if (actual !== undefined) budgetItem.actual = Math.max(0, Number(actual) || 0);
  if (paid !== undefined) budgetItem.paid = Boolean(paid);
  await writeData(data);
  res.json(budgetItem);
});

app.delete("/api/budget-items/:id", async (req, res) => {
  const data = await readData();
  const exists = data.budgetItems.some((b) => b.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Budget item not found" });
  data.budgetItems = data.budgetItems.filter((b) => b.id !== req.params.id);
  await writeData(data);
  res.status(204).end();
});

// ---------- Budget categories ----------

app.get("/api/budget-categories", async (req, res) => {
  const data = await readData();
  res.json(data.budgetCategories);
});

app.post("/api/budget-categories", async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "title is required" });
  }
  const data = await readData();
  const category = { id: uuid(), title: title.trim(), createdAt: new Date().toISOString() };
  data.budgetCategories.push(category);
  await writeData(data);
  res.status(201).json(category);
});

// ---------- Exchange rate (MYR -> SGD, for the Budget page) ----------

app.get("/api/exchange-rate", async (req, res) => {
  const data = await readData();
  res.json(data.exchangeRate);
});

app.post("/api/exchange-rate/refresh", async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch("https://api.frankfurter.app/latest?from=MYR&to=SGD", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const json = await response.json();
    const rate = json?.rates?.SGD;
    if (!rate) throw new Error("No SGD rate in response");
    const data = await readData();
    data.exchangeRate = {
      myrToSgd: rate,
      updatedAt: new Date().toISOString(),
      source: "frankfurter.app (ECB reference rates)",
    };
    await writeData(data);
    res.json(data.exchangeRate);
  } catch (err) {
    res.status(502).json({ error: "Could not fetch a live rate right now. You can enter one manually below." });
  }
});

app.put("/api/exchange-rate", async (req, res) => {
  const { myrToSgd } = req.body;
  if (!myrToSgd || Number(myrToSgd) <= 0) {
    return res.status(400).json({ error: "myrToSgd must be a positive number" });
  }
  const data = await readData();
  data.exchangeRate = {
    myrToSgd: Number(myrToSgd),
    updatedAt: new Date().toISOString(),
    source: "manual",
  };
  await writeData(data);
  res.json(data.exchangeRate);
});

// ---------- Vendors ----------

app.get("/api/vendors", async (req, res) => {
  const data = await readData();
  res.json(data.vendors);
});

app.post("/api/vendors", async (req, res) => {
  const { name, category, contact, cost, status, notes } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }
  const data = await readData();
  const vendor = {
    id: uuid(),
    name: name.trim(),
    category: category || "Other",
    contact: contact || "",
    cost: Math.max(0, Number(cost) || 0),
    status: status || "inquired",
    notes: notes || "",
    createdAt: new Date().toISOString(),
  };
  data.vendors.push(vendor);
  await writeData(data);
  res.status(201).json(vendor);
});

app.put("/api/vendors/:id", async (req, res) => {
  const { name, category, contact, cost, status, notes } = req.body;
  const data = await readData();
  const vendor = data.vendors.find((v) => v.id === req.params.id);
  if (!vendor) return res.status(404).json({ error: "Vendor not found" });
  if (name !== undefined) vendor.name = name;
  if (category !== undefined) vendor.category = category;
  if (contact !== undefined) vendor.contact = contact;
  if (cost !== undefined) vendor.cost = Math.max(0, Number(cost) || 0);
  if (status !== undefined) vendor.status = status;
  if (notes !== undefined) vendor.notes = notes;
  await writeData(data);
  res.json(vendor);
});

app.delete("/api/vendors/:id", async (req, res) => {
  const data = await readData();
  const exists = data.vendors.some((v) => v.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Vendor not found" });
  data.vendors = data.vendors.filter((v) => v.id !== req.params.id);
  await writeData(data);
  res.status(204).end();
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
