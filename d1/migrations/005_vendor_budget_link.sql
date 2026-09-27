-- Links a budget item back to the vendor it was auto-created from, so that
-- marking a vendor "Paid" creates a matching Uncategorized budget expense
-- (name + cost, in MYR since vendor cost is always entered in RM), editing
-- the cost/name while still paid keeps that expense in sync, and un-marking
-- paid (or deleting the vendor) removes it again instead of leaving a stale
-- entry behind. NULL for any budget item created manually on the Budget page.
ALTER TABLE budget_items ADD COLUMN sourceVendorId TEXT;
