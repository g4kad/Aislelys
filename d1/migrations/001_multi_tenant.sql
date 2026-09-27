-- Multi-tenant migration: introduces the `couples` table and stamps a
-- `coupleId` column onto every couple-owned table, backfilling all existing
-- rows to the one couple that already existed in production (Sara & Kris).
-- Already applied to production on 2026-08-19; kept here as a record.

CREATE TABLE IF NOT EXISTS couples (
  id TEXT PRIMARY KEY,
  partner1Name TEXT NOT NULL,
  partner2Name TEXT NOT NULL,
  weddingDate TEXT,
  budgetTotal REAL NOT NULL DEFAULT 0,
  notificationsHoldUntil TEXT,
  createdAt TEXT NOT NULL
);

INSERT INTO couples (id, partner1Name, partner2Name, weddingDate, budgetTotal, notificationsHoldUntil, createdAt)
SELECT
  '997560ce-b0f2-47d3-929a-0ae9de5422f2',
  (SELECT name FROM users WHERE id = 'bride'),
  (SELECT name FROM users WHERE id = 'groom'),
  (SELECT json_extract(value, '$') FROM settings WHERE key = 'weddingDate'),
  COALESCE((SELECT json_extract(value, '$.total') FROM settings WHERE key = 'budget'), 0),
  (SELECT json_extract(value, '$') FROM settings WHERE key = 'notificationsHoldUntil'),
  '2026-08-19T00:00:00.000Z';

ALTER TABLE users ADD COLUMN coupleId TEXT NOT NULL DEFAULT '997560ce-b0f2-47d3-929a-0ae9de5422f2';
ALTER TABLE notifications ADD COLUMN coupleId TEXT NOT NULL DEFAULT '997560ce-b0f2-47d3-929a-0ae9de5422f2';
ALTER TABLE sections ADD COLUMN coupleId TEXT NOT NULL DEFAULT '997560ce-b0f2-47d3-929a-0ae9de5422f2';
ALTER TABLE events ADD COLUMN coupleId TEXT NOT NULL DEFAULT '997560ce-b0f2-47d3-929a-0ae9de5422f2';
ALTER TABLE tasks ADD COLUMN coupleId TEXT NOT NULL DEFAULT '997560ce-b0f2-47d3-929a-0ae9de5422f2';
ALTER TABLE guest_owners ADD COLUMN coupleId TEXT NOT NULL DEFAULT '997560ce-b0f2-47d3-929a-0ae9de5422f2';
ALTER TABLE guest_categories ADD COLUMN coupleId TEXT NOT NULL DEFAULT '997560ce-b0f2-47d3-929a-0ae9de5422f2';
ALTER TABLE guests ADD COLUMN coupleId TEXT NOT NULL DEFAULT '997560ce-b0f2-47d3-929a-0ae9de5422f2';
ALTER TABLE inspiration_categories ADD COLUMN coupleId TEXT NOT NULL DEFAULT '997560ce-b0f2-47d3-929a-0ae9de5422f2';
ALTER TABLE inspiration_items ADD COLUMN coupleId TEXT NOT NULL DEFAULT '997560ce-b0f2-47d3-929a-0ae9de5422f2';
ALTER TABLE budget_categories ADD COLUMN coupleId TEXT NOT NULL DEFAULT '997560ce-b0f2-47d3-929a-0ae9de5422f2';
ALTER TABLE budget_items ADD COLUMN coupleId TEXT NOT NULL DEFAULT '997560ce-b0f2-47d3-929a-0ae9de5422f2';
ALTER TABLE vendor_categories ADD COLUMN coupleId TEXT NOT NULL DEFAULT '997560ce-b0f2-47d3-929a-0ae9de5422f2';
ALTER TABLE vendors ADD COLUMN coupleId TEXT NOT NULL DEFAULT '997560ce-b0f2-47d3-929a-0ae9de5422f2';
ALTER TABLE todos ADD COLUMN coupleId TEXT NOT NULL DEFAULT '997560ce-b0f2-47d3-929a-0ae9de5422f2';

DELETE FROM settings WHERE key IN ('weddingDate', 'budget', 'notificationsHoldUntil');
