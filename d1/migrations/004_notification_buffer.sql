-- Adds a buffer/delay before task & to-do notifications become visible, so
-- a quick create-then-undo (e.g. adding a task by mistake, then deleting it)
-- never shows up as noise. Notifications are inserted immediately with a
-- scheduledFor timestamp 10 minutes out; the read endpoint only returns rows
-- whose scheduledFor has passed. If the underlying action is reverted within
-- that window, the pending row is deleted instead of ever surfacing.
ALTER TABLE notifications ADD COLUMN scheduledFor TEXT;
ALTER TABLE notifications ADD COLUMN kind TEXT;

-- Backfill existing rows so they stay immediately visible rather than being
-- retroactively held back.
UPDATE notifications SET scheduledFor = createdAt WHERE scheduledFor IS NULL;
