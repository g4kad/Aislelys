import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(await readFile(path.join(__dirname, "../server/data.json"), "utf-8"));

function sqlStr(v) {
  if (v === null || v === undefined) return "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}
function sqlNum(v) {
  return Number.isFinite(Number(v)) ? Number(v) : 0;
}
function sqlBool(v) {
  return v ? 1 : 0;
}

const lines = [];

if (data.weddingDate) {
  lines.push(`INSERT INTO settings (key, value) VALUES ('weddingDate', ${sqlStr(JSON.stringify(data.weddingDate))});`);
}
lines.push(`INSERT INTO settings (key, value) VALUES ('budget', ${sqlStr(JSON.stringify(data.budget))});`);
lines.push(`INSERT INTO settings (key, value) VALUES ('exchangeRate', ${sqlStr(JSON.stringify(data.exchangeRate))});`);

for (const s of data.sections) {
  lines.push(`INSERT INTO sections (id, title, color) VALUES (${sqlStr(s.id)}, ${sqlStr(s.title)}, ${sqlStr(s.color)});`);
}

for (const u of data.users || []) {
  lines.push(
    `INSERT INTO users (id, name, passwordHash, passwordSalt) VALUES (${sqlStr(u.id)}, ${sqlStr(u.name)}, ${sqlStr(u.passwordHash)}, ${sqlStr(u.passwordSalt)});`
  );
}

for (const e of data.events) {
  lines.push(
    `INSERT INTO events (id, title, date, time, sectionId, notes, createdAt) VALUES (${sqlStr(e.id)}, ${sqlStr(e.title)}, ${sqlStr(e.date)}, ${sqlStr(e.time)}, ${sqlStr(e.sectionId)}, ${sqlStr(e.notes)}, ${sqlStr(e.createdAt)});`
  );
  for (const t of e.tasks) {
    lines.push(
      `INSERT INTO tasks (id, eventId, name, assigneeUserId, createdByUserId, done) VALUES (${sqlStr(t.id)}, ${sqlStr(e.id)}, ${sqlStr(t.name)}, ${sqlStr(t.assigneeUserId)}, ${sqlStr(t.createdByUserId)}, ${sqlBool(t.done)});`
    );
  }
}

for (const o of data.guestOwners) {
  lines.push(
    `INSERT INTO guest_owners (id, name, createdAt) VALUES (${sqlStr(o.id)}, ${sqlStr(o.name)}, ${sqlStr(o.createdAt)});`
  );
  for (const cat of o.categories || []) {
    lines.push(
      `INSERT INTO guest_categories (id, ownerId, title) VALUES (${sqlStr(cat.id)}, ${sqlStr(o.id)}, ${sqlStr(cat.title)});`
    );
  }
  for (const g of o.guests) {
    lines.push(
      `INSERT INTO guests (id, ownerId, categoryId, name, plusCount, isVip) VALUES (${sqlStr(g.id)}, ${sqlStr(o.id)}, ${sqlStr(g.categoryId)}, ${sqlStr(g.name)}, ${sqlNum(g.plusCount)}, ${sqlBool(g.isVip)});`
    );
  }
}

for (const c of data.inspirationCategories) {
  lines.push(
    `INSERT INTO inspiration_categories (id, title, createdAt) VALUES (${sqlStr(c.id)}, ${sqlStr(c.title)}, ${sqlStr(c.createdAt)});`
  );
}

for (const i of data.inspirationItems) {
  lines.push(
    `INSERT INTO inspiration_items (id, url, caption, categoryId, approved, createdAt) VALUES (${sqlStr(i.id)}, ${sqlStr(i.url)}, ${sqlStr(i.caption)}, ${sqlStr(i.categoryId)}, ${sqlBool(i.approved)}, ${sqlStr(i.createdAt)});`
  );
}

for (const c of data.budgetCategories) {
  lines.push(
    `INSERT INTO budget_categories (id, title, createdAt) VALUES (${sqlStr(c.id)}, ${sqlStr(c.title)}, ${sqlStr(c.createdAt)});`
  );
}

for (const b of data.budgetItems) {
  lines.push(
    `INSERT INTO budget_items (id, item, category, currency, estimated, actual, paid, createdAt) VALUES (${sqlStr(b.id)}, ${sqlStr(b.item)}, ${sqlStr(b.category)}, ${sqlStr(b.currency)}, ${sqlNum(b.estimated)}, ${sqlNum(b.actual)}, ${sqlBool(b.paid)}, ${sqlStr(b.createdAt)});`
  );
}

for (const v of data.vendors) {
  lines.push(
    `INSERT INTO vendors (id, name, category, contact, cost, status, notes, createdAt) VALUES (${sqlStr(v.id)}, ${sqlStr(v.name)}, ${sqlStr(v.category)}, ${sqlStr(v.contact)}, ${sqlNum(v.cost)}, ${sqlStr(v.status)}, ${sqlStr(v.notes)}, ${sqlStr(v.createdAt)});`
  );
}

for (const t of data.todos) {
  lines.push(
    `INSERT INTO todos (id, date, text, assigneeUserId, createdByUserId, done, createdAt) VALUES (${sqlStr(t.id)}, ${sqlStr(t.date)}, ${sqlStr(t.text)}, ${sqlStr(t.assigneeUserId)}, ${sqlStr(t.createdByUserId)}, ${sqlBool(t.done)}, ${sqlStr(t.createdAt)});`
  );
}

await writeFile(path.join(__dirname, "seed.sql"), lines.join("\n") + "\n");
console.log(`Wrote ${lines.length} INSERT statements to d1/seed.sql`);
