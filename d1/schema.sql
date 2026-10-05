-- Wedding planner D1 schema.
-- Multi-tenant: every couple gets their own private workspace (a "couple"),
-- identified by a random id used as the workspace URL slug (/w/:coupleId).
-- All couple-owned tables carry a coupleId column so queries can be scoped
-- to the signed-in user's own couple and never leak across workspaces.
--
-- Single-value settings that are NOT couple-specific (just the shared,
-- externally-fetched MYR->SGD rate) live in the settings table as
-- JSON-encoded strings, mirroring the old data.json shape.

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS couples (
  id TEXT PRIMARY KEY,
  partner1Name TEXT NOT NULL,
  partner2Name TEXT NOT NULL,
  weddingDate TEXT,
  budgetTotal REAL NOT NULL DEFAULT 0,
  savings REAL NOT NULL DEFAULT 0,
  homeCurrency TEXT NOT NULL DEFAULT 'SGD',
  notificationsHoldUntil TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  coupleId TEXT NOT NULL,
  name TEXT NOT NULL,
  passwordHash TEXT NOT NULL,
  passwordSalt TEXT NOT NULL,
  clerkUserId TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk_user ON users(clerkUserId);

CREATE TABLE IF NOT EXISTS partner_invites (
  token TEXT PRIMARY KEY,
  coupleId TEXT NOT NULL,
  userId TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  expiresAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  coupleId TEXT NOT NULL,
  userId TEXT NOT NULL,
  actorUserId TEXT,
  message TEXT NOT NULL,
  entityType TEXT,
  entityId TEXT,
  kind TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  scheduledFor TEXT
);

CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  coupleId TEXT NOT NULL,
  title TEXT NOT NULL,
  color TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  coupleId TEXT NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL DEFAULT '',
  sectionId TEXT,
  notes TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  coupleId TEXT NOT NULL,
  eventId TEXT NOT NULL,
  name TEXT NOT NULL,
  assigneeUserId TEXT,
  createdByUserId TEXT,
  done INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS guest_owners (
  id TEXT PRIMARY KEY,
  coupleId TEXT NOT NULL,
  name TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS guest_categories (
  id TEXT PRIMARY KEY,
  coupleId TEXT NOT NULL,
  ownerId TEXT NOT NULL,
  title TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS guests (
  id TEXT PRIMARY KEY,
  coupleId TEXT NOT NULL,
  ownerId TEXT NOT NULL,
  categoryId TEXT NOT NULL,
  name TEXT NOT NULL,
  plusCount INTEGER NOT NULL DEFAULT 0,
  isVip INTEGER NOT NULL DEFAULT 0,
  included INTEGER NOT NULL DEFAULT 1,
  contact TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  email TEXT
);

CREATE TABLE IF NOT EXISTS inspiration_categories (
  id TEXT PRIMARY KEY,
  coupleId TEXT NOT NULL,
  title TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inspiration_items (
  id TEXT PRIMARY KEY,
  coupleId TEXT NOT NULL,
  url TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  categoryId TEXT,
  approved INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS budget_categories (
  id TEXT PRIMARY KEY,
  coupleId TEXT NOT NULL,
  title TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#7C9885',
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS budget_items (
  id TEXT PRIMARY KEY,
  coupleId TEXT NOT NULL,
  item TEXT NOT NULL,
  category TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SGD',
  estimated REAL NOT NULL DEFAULT 0,
  actual REAL NOT NULL DEFAULT 0,
  paid INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  sourceVendorId TEXT,
  notes TEXT NOT NULL DEFAULT '',
  extras TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS vendor_categories (
  id TEXT PRIMARY KEY,
  coupleId TEXT NOT NULL,
  title TEXT NOT NULL,
  color TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  coupleId TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  contact TEXT NOT NULL DEFAULT '',
  cost REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'inquired',
  notes TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MYR',
  budgetCategory TEXT NOT NULL DEFAULT '',
  downpayment REAL NOT NULL DEFAULT 0,
  extras TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  coupleId TEXT NOT NULL,
  date TEXT NOT NULL,
  text TEXT NOT NULL,
  assigneeUserId TEXT,
  createdByUserId TEXT,
  done INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL
);
