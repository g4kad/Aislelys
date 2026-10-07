-- "Our Big Day" setup: how many days the wedding runs and the sessions
-- (tea ceremony, reception, after party…) that each get their own timeline,
-- as JSON {days, sessions: [{id, name, day}]}. NULL until the couple sets it up.
ALTER TABLE couples ADD COLUMN bigDay TEXT;

-- ROM (Registry of Marriage) date, shown on the Overview alongside the
-- wedding countdown. YYYY-MM-DD or NULL.
ALTER TABLE couples ADD COLUMN romDate TEXT;
