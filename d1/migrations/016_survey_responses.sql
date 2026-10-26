-- Public feedback forms (e.g. the "ten-brides" survey). Not couple-scoped.
-- Answers are kept as JSON keyed by question id so new questions don't
-- need a schema change.
CREATE TABLE IF NOT EXISTS survey_responses (
  id TEXT PRIMARY KEY,
  survey TEXT NOT NULL,
  answers TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
