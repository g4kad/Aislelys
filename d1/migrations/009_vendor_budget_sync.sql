-- Vendors now feed the budget as soon as they're Booked (not only once
-- Paid), into a budget category chosen on the vendor, in either currency.
-- The vendor and its linked budget line (budget_items.sourceVendorId) are
-- kept in sync in both directions by the API.

ALTER TABLE vendors ADD COLUMN currency TEXT NOT NULL DEFAULT 'MYR';
ALTER TABLE vendors ADD COLUMN budgetCategory TEXT NOT NULL DEFAULT '';

-- Carry over the category of any line already created for a paid vendor.
UPDATE vendors
SET budgetCategory = COALESCE(
  (SELECT category FROM budget_items b WHERE b.sourceVendorId = vendors.id LIMIT 1),
  ''
);

-- Booked vendors weren't on the budget before; add them (unpaid, Uncategorized).
INSERT INTO budget_items (id, coupleId, item, category, currency, estimated, actual, paid, createdAt, sourceVendorId)
SELECT
  lower(hex(randomblob(16))),
  v.coupleId,
  v.name,
  '',
  'MYR',
  v.cost,
  v.cost,
  0,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  v.id
FROM vendors v
WHERE v.status = 'booked'
  AND NOT EXISTS (SELECT 1 FROM budget_items b WHERE b.sourceVendorId = v.id);
