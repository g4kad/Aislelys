-- Track which couple/partner submitted each survey response, so submitting
-- the "ten-brides" feedback form now requires being signed in.
ALTER TABLE survey_responses ADD COLUMN coupleId TEXT;
ALTER TABLE survey_responses ADD COLUMN userName TEXT;
