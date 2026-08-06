DROP VIEW IF EXISTS "public"."current_price_bars";
ALTER TABLE "price_bars" DROP COLUMN IF EXISTS "quality_flags";
ALTER TABLE "price_bars" DROP COLUMN IF EXISTS "provider_revision";
ALTER TABLE "price_bars" DROP COLUMN IF EXISTS "received_at";
ALTER TABLE "price_bars" DROP COLUMN IF EXISTS "available_at";
ALTER TABLE "price_bars" DROP COLUMN IF EXISTS "adjusted_close";
CREATE VIEW "public"."current_price_bars" AS (
  SELECT DISTINCT ON (
    "price_bars"."instrument_id",
    "price_bars"."provider_id",
    "price_bars"."timeframe",
    "price_bars"."open_time"
  )
    "id",
    "instrument_id",
    "provider_id",
    "timeframe",
    "open_time",
    "close_time",
    "open",
    "high",
    "low",
    "close",
    "volume",
    "is_closed",
    "source_timestamp",
    "ingested_at",
    "revision",
    "quality_status",
    "created_at",
    "updated_at"
  FROM "price_bars"
  ORDER BY
    "price_bars"."instrument_id",
    "price_bars"."provider_id",
    "price_bars"."timeframe",
    "price_bars"."open_time",
    "price_bars"."revision" DESC
);
