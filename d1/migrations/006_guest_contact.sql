-- Adds an optional contact field (phone/email, free text) per guest, edited
-- inline from the Guest List page.
ALTER TABLE guests ADD COLUMN contact TEXT;
