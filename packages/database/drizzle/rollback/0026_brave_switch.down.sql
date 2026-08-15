DROP TABLE IF EXISTS corporate_disclosure_entities;
ALTER TABLE corporate_disclosure_revisions
  DROP CONSTRAINT IF EXISTS corporate_disclosure_state_check;
ALTER TABLE corporate_disclosure_revisions
  DROP COLUMN IF EXISTS state;
