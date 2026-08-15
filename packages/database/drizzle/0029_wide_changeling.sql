CREATE TABLE "short_selling_activity_observations" (
	"revision_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supersedes_revision_id" uuid,
	"correction_reason" text,
	"activity_id" varchar(255) NOT NULL,
	"instrument_id" uuid NOT NULL,
	"trade_date" date NOT NULL,
	"session" varchar(32) DEFAULT 'ALL' NOT NULL,
	"quantity" numeric(28, 10),
	"value" numeric(28, 10),
	"share_of_turnover" numeric(20, 12),
	"data_cutoff" timestamp with time zone NOT NULL,
	"provider_id" uuid NOT NULL,
	"provider_dataset" varchar(128) NOT NULL,
	"provider_revision" varchar(128),
	"source_timestamp" timestamp with time zone NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"available_at" timestamp with time zone NOT NULL,
	"delivery_mode" varchar(16) NOT NULL,
	"license_class" varchar(40) NOT NULL,
	"redistribution_classes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"quality_state" varchar(32) NOT NULL,
	CONSTRAINT "short_selling_activity_nonnegative_check" CHECK (("short_selling_activity_observations"."quantity" is null or "short_selling_activity_observations"."quantity" >= 0) and ("short_selling_activity_observations"."value" is null or "short_selling_activity_observations"."value" >= 0)),
	CONSTRAINT "short_selling_activity_share_check" CHECK ("short_selling_activity_observations"."share_of_turnover" is null or ("short_selling_activity_observations"."share_of_turnover" >= 0 and "short_selling_activity_observations"."share_of_turnover" <= 1)),
	CONSTRAINT "short_selling_activity_has_value_check" CHECK ("short_selling_activity_observations"."quantity" is not null or "short_selling_activity_observations"."value" is not null or "short_selling_activity_observations"."share_of_turnover" is not null)
);
--> statement-breakpoint
ALTER TABLE "intelligence_market_measures" ADD COLUMN "source_reference" text;--> statement-breakpoint
UPDATE "intelligence_market_measures"
SET "source_reference" = 'urn:atlas:legacy-market-measure:' || "measure_id"
WHERE "source_reference" IS NULL;--> statement-breakpoint
ALTER TABLE "intelligence_market_measures" ALTER COLUMN "source_reference" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "intelligence_market_measures" ADD COLUMN "structured_attributes" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "short_selling_activity_observations" ADD CONSTRAINT "short_selling_activity_observations_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "short_selling_activity_observations" ADD CONSTRAINT "short_selling_activity_observations_provider_id_data_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "short_selling_activity_observations" ADD CONSTRAINT "short_selling_activity_supersedes_fk" FOREIGN KEY ("supersedes_revision_id") REFERENCES "public"."short_selling_activity_observations"("revision_id") ON DELETE restrict;--> statement-breakpoint
CREATE UNIQUE INDEX "short_selling_activity_revision_unique" ON "short_selling_activity_observations" USING btree ("provider_id","activity_id","provider_revision");--> statement-breakpoint
CREATE INDEX "short_selling_activity_instrument_date_idx" ON "short_selling_activity_observations" USING btree ("instrument_id","trade_date");--> statement-breakpoint
CREATE INDEX "intelligence_market_measure_type_period_idx" ON "intelligence_market_measures" USING btree ("type","effective_from","effective_until");--> statement-breakpoint
CREATE INDEX "intelligence_market_measure_published_idx" ON "intelligence_market_measures" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "intelligence_market_measure_available_idx" ON "intelligence_market_measures" USING btree ("available_at");--> statement-breakpoint
ALTER TABLE "intelligence_market_measures" ADD CONSTRAINT "intelligence_market_measure_status_check" CHECK ("intelligence_market_measures"."status" in ('SCHEDULED','ACTIVE','EXPIRED','CORRECTED','SUPERSEDED','CANCELLED'));
--> statement-breakpoint
CREATE TRIGGER prevent_short_selling_activity_mutation BEFORE UPDATE OR DELETE ON "short_selling_activity_observations" FOR EACH ROW EXECUTE FUNCTION prevent_intelligence_revision_mutation();
