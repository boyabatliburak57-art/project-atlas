DROP INDEX IF EXISTS "intelligence_market_measure_available_idx";
DROP INDEX IF EXISTS "intelligence_market_measure_published_idx";
DROP INDEX IF EXISTS "intelligence_market_measure_type_period_idx";
ALTER TABLE "intelligence_market_measures"
  DROP CONSTRAINT IF EXISTS "intelligence_market_measure_status_check";
ALTER TABLE "intelligence_market_measures"
  DROP COLUMN IF EXISTS "structured_attributes",
  DROP COLUMN IF EXISTS "source_reference";
DROP TABLE IF EXISTS "short_selling_activity_observations";
