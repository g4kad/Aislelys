-- Adds a persisted display order for Wedding Cards (sections), so drag-and-drop
-- reordering has somewhere to save to. Backfills existing rows with sequential
-- positions matching their current (arbitrary) SELECT order, so nothing visibly
-- reshuffles until a couple actually drags a card.

ALTER TABLE sections ADD COLUMN position INTEGER NOT NULL DEFAULT 0;

UPDATE sections
SET position = (
  SELECT COUNT(*) FROM sections s2
  WHERE s2.coupleId = sections.coupleId AND s2.rowid < sections.rowid
);
