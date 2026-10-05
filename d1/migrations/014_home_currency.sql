-- Which currency a couple's budget totals convert everything into (SGD,
-- MYR, THB or PHP), set from Settings → Currency.
ALTER TABLE couples ADD COLUMN homeCurrency TEXT NOT NULL DEFAULT 'SGD';
