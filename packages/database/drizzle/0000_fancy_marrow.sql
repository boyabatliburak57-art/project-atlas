CREATE TABLE "data_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(160) NOT NULL,
	"status" varchar(24) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "data_providers_status_check" CHECK ("data_providers"."status" in ('active', 'inactive', 'degraded'))
);
--> statement-breakpoint
CREATE TABLE "instrument_symbol_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instrument_id" uuid NOT NULL,
	"symbol" varchar(32) NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instrument_symbol_history_dates_check" CHECK ("instrument_symbol_history"."valid_to" is null or "instrument_symbol_history"."valid_to" >= "instrument_symbol_history"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "instruments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" varchar(32) NOT NULL,
	"normalized_symbol" varchar(32) NOT NULL,
	"name" varchar(255) NOT NULL,
	"isin" varchar(12),
	"market_code" varchar(32) NOT NULL,
	"currency_code" char(3) NOT NULL,
	"status" varchar(24) NOT NULL,
	"sector_id" uuid,
	"listed_at" date,
	"delisted_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instruments_status_check" CHECK ("instruments"."status" in ('active', 'inactive', 'delisted')),
	CONSTRAINT "instruments_listing_dates_check" CHECK ("instruments"."delisted_at" is null or "instruments"."listed_at" is null or "instruments"."delisted_at" >= "instruments"."listed_at")
);
--> statement-breakpoint
CREATE TABLE "provider_instrument_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"provider_symbol" varchar(128) NOT NULL,
	"provider_market" varchar(64),
	"active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(160) NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sectors_code_not_blank" CHECK (length(trim("sectors"."code")) > 0)
);
--> statement-breakpoint
CREATE TABLE "data_quality_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid,
	"instrument_id" uuid,
	"timeframe" varchar(16),
	"open_time" timestamp with time zone,
	"issue_type" varchar(64) NOT NULL,
	"severity" varchar(24) NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "data_quality_issues_severity_check" CHECK ("data_quality_issues"."severity" in ('info', 'warning', 'error', 'critical')),
	CONSTRAINT "data_quality_issues_resolution_time_check" CHECK ("data_quality_issues"."resolved_at" is null or "data_quality_issues"."resolved_at" >= "data_quality_issues"."detected_at")
);
--> statement-breakpoint
CREATE TABLE "ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"job_type" varchar(64) NOT NULL,
	"status" varchar(24) NOT NULL,
	"requested_from" timestamp with time zone,
	"requested_to" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"fetched_count" integer DEFAULT 0 NOT NULL,
	"accepted_count" integer DEFAULT 0 NOT NULL,
	"rejected_count" integer DEFAULT 0 NOT NULL,
	"error_code" varchar(64),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingestion_runs_status_check" CHECK ("ingestion_runs"."status" in ('pending', 'running', 'completed', 'failed')),
	CONSTRAINT "ingestion_runs_counts_check" CHECK ("ingestion_runs"."fetched_count" >= 0 and "ingestion_runs"."accepted_count" >= 0 and "ingestion_runs"."rejected_count" >= 0),
	CONSTRAINT "ingestion_runs_request_range_check" CHECK ("ingestion_runs"."requested_to" is null or "ingestion_runs"."requested_from" is null or "ingestion_runs"."requested_to" >= "ingestion_runs"."requested_from"),
	CONSTRAINT "ingestion_runs_completion_time_check" CHECK ("ingestion_runs"."completed_at" is null or "ingestion_runs"."completed_at" >= "ingestion_runs"."started_at")
);
--> statement-breakpoint
CREATE TABLE "price_bars" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "price_bars_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"instrument_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"timeframe" varchar(16) NOT NULL,
	"open_time" timestamp with time zone NOT NULL,
	"close_time" timestamp with time zone NOT NULL,
	"open" numeric NOT NULL,
	"high" numeric NOT NULL,
	"low" numeric NOT NULL,
	"close" numeric NOT NULL,
	"volume" numeric NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"source_timestamp" timestamp with time zone,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"quality_status" varchar(24) DEFAULT 'accepted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_bars_volume_check" CHECK ("price_bars"."volume" >= 0),
	CONSTRAINT "price_bars_revision_check" CHECK ("price_bars"."revision" >= 1),
	CONSTRAINT "price_bars_time_check" CHECK ("price_bars"."close_time" > "price_bars"."open_time"),
	CONSTRAINT "price_bars_ohlc_check" CHECK ("price_bars"."high" >= greatest("price_bars"."open", "price_bars"."close", "price_bars"."low") and "price_bars"."low" <= least("price_bars"."open", "price_bars"."close", "price_bars"."high")),
	CONSTRAINT "price_bars_quality_status_check" CHECK ("price_bars"."quality_status" in ('accepted', 'provisional', 'corrected'))
);
--> statement-breakpoint
ALTER TABLE "instrument_symbol_history" ADD CONSTRAINT "instrument_symbol_history_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instruments" ADD CONSTRAINT "instruments_sector_id_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."sectors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_instrument_mappings" ADD CONSTRAINT "provider_instrument_mappings_provider_id_data_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_instrument_mappings" ADD CONSTRAINT "provider_instrument_mappings_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_parent_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sectors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_quality_issues" ADD CONSTRAINT "data_quality_issues_provider_id_data_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_quality_issues" ADD CONSTRAINT "data_quality_issues_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_runs" ADD CONSTRAINT "ingestion_runs_provider_id_data_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_bars" ADD CONSTRAINT "price_bars_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_bars" ADD CONSTRAINT "price_bars_provider_id_data_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "data_providers_code_unique" ON "data_providers" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "instrument_symbol_history_period_unique" ON "instrument_symbol_history" USING btree ("instrument_id","symbol","valid_from");--> statement-breakpoint
CREATE INDEX "instrument_symbol_history_instrument_idx" ON "instrument_symbol_history" USING btree ("instrument_id");--> statement-breakpoint
CREATE UNIQUE INDEX "instruments_active_normalized_symbol_unique" ON "instruments" USING btree ("normalized_symbol") WHERE "instruments"."status" = 'active';--> statement-breakpoint
CREATE INDEX "instruments_sector_id_idx" ON "instruments" USING btree ("sector_id");--> statement-breakpoint
CREATE INDEX "instruments_market_status_idx" ON "instruments" USING btree ("market_code","status");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_instrument_mappings_symbol_unique" ON "provider_instrument_mappings" USING btree ("provider_id","provider_symbol");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_instrument_mappings_active_instrument_unique" ON "provider_instrument_mappings" USING btree ("provider_id","instrument_id") WHERE "provider_instrument_mappings"."active" = true;--> statement-breakpoint
CREATE INDEX "provider_instrument_mappings_instrument_active_idx" ON "provider_instrument_mappings" USING btree ("instrument_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "sectors_code_unique" ON "sectors" USING btree ("code");--> statement-breakpoint
CREATE INDEX "sectors_parent_id_idx" ON "sectors" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "data_quality_issues_unresolved_idx" ON "data_quality_issues" USING btree ("detected_at" DESC NULLS LAST) WHERE "data_quality_issues"."resolved_at" is null;--> statement-breakpoint
CREATE INDEX "data_quality_issues_instrument_time_idx" ON "data_quality_issues" USING btree ("instrument_id","open_time");--> statement-breakpoint
CREATE INDEX "ingestion_runs_provider_started_at_idx" ON "ingestion_runs" USING btree ("provider_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "price_bars_natural_revision_unique" ON "price_bars" USING btree ("instrument_id","provider_id","timeframe","open_time","revision");--> statement-breakpoint
CREATE INDEX "price_bars_instrument_timeframe_open_time_idx" ON "price_bars" USING btree ("instrument_id","timeframe","open_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "price_bars_timeframe_open_time_idx" ON "price_bars" USING btree ("timeframe","open_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "price_bars_provider_ingested_at_idx" ON "price_bars" USING btree ("provider_id","ingested_at" DESC NULLS LAST);