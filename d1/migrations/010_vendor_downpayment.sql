-- Vendors can record a downpayment (in the vendor's own currency), and have
-- a "downpayment" status between booked and paid.
ALTER TABLE vendors ADD COLUMN downpayment REAL NOT NULL DEFAULT 0;
