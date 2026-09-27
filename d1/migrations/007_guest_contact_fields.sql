-- Replaces the single free-text "contact" field (shipped moments ago, never
-- populated with real data) with three distinct fields shown in the same
-- click-to-reveal panel: phone number, address, and notes.
ALTER TABLE guests ADD COLUMN phone TEXT;
ALTER TABLE guests ADD COLUMN address TEXT;
ALTER TABLE guests ADD COLUMN notes TEXT;
