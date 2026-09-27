-- Notes on budget lines. For vendor-linked lines the API reads and writes the
-- vendor's notes instead, so this column is used by budget-only lines.
ALTER TABLE budget_items ADD COLUMN notes TEXT NOT NULL DEFAULT '';
