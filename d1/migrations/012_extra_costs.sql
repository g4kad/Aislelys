-- Extra costs on top of a vendor's / expense's base cost (e.g. add-ons to a
-- venue package), as a JSON array of {id, label, amount}. Vendor-linked
-- budget lines use the vendor's list; budget_items.extras is for budget-only
-- lines.
ALTER TABLE vendors ADD COLUMN extras TEXT NOT NULL DEFAULT '[]';
ALTER TABLE budget_items ADD COLUMN extras TEXT NOT NULL DEFAULT '[]';
