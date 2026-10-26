ALTER TABLE sessions ADD COLUMN lastSeenAt TEXT;
UPDATE sessions SET lastSeenAt = createdAt WHERE lastSeenAt IS NULL;
