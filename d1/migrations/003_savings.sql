-- Adds a "savings so far" amount per couple, shown against their total
-- budget on the Budget page (replacing the old "Total items" stat).
ALTER TABLE couples ADD COLUMN savings REAL NOT NULL DEFAULT 0;
