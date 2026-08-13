CREATE TABLE "corporate_disclosure_revisions" (
	"revision_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supersedes_revision_id" uuid,
	"correction_reason" text,
	"disclosure_id" uuid NOT NULL,
	"external_disclosure_id" varchar(255) NOT NULL,
	"company_id" uuid,
	"disclosure_type" varchar(40) NOT NULL,
	"category" varchar(128) NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"published_at" timestamp with time zone NOT NULL,
	"effective_at" timestamp with time zone,
	"reporting_period" varchar(64),
	"source_reference" text NOT NULL,
	"normalized_attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
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
	CONSTRAINT "corporate_disclosure_available_check" CHECK ("corporate_disclosure_revisions"."available_at" >= "corporate_disclosure_revisions"."published_at" and "corporate_disclosure_revisions"."available_at" <= "corporate_disclosure_revisions"."ingested_at")
);
--> statement-breakpoint
CREATE TABLE "derivative_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"underlying_instrument_id" uuid NOT NULL,
	"contract_code" varchar(96) NOT NULL,
	"type" varchar(16) NOT NULL,
	"expiry" timestamp with time zone NOT NULL,
	"multiplier" numeric(28, 10) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"settlement_type" varchar(16) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "derivative_contracts_type_check" CHECK ("derivative_contracts"."type" in ('FUTURE','OPTION'))
);
--> statement-breakpoint
CREATE TABLE "fund_holding_revisions" (
	"revision_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supersedes_revision_id" uuid,
	"correction_reason" text,
	"fund_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"reporting_date" date NOT NULL,
	"quantity" numeric(28, 10),
	"value" numeric(28, 10),
	"weight" numeric(20, 12),
	"published_at" timestamp with time zone NOT NULL,
	"provider_id" uuid NOT NULL,
	"provider_dataset" varchar(128) NOT NULL,
	"provider_revision" varchar(128),
	"source_timestamp" timestamp with time zone NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"available_at" timestamp with time zone NOT NULL,
	"delivery_mode" varchar(16) NOT NULL,
	"license_class" varchar(40) NOT NULL,
	"redistribution_classes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"quality_state" varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institutional_flow_observations" (
	"revision_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supersedes_revision_id" uuid,
	"correction_reason" text,
	"instrument_id" uuid NOT NULL,
	"institution_id" uuid NOT NULL,
	"trade_date" date NOT NULL,
	"session" varchar(32) DEFAULT 'ALL' NOT NULL,
	"buy_quantity" numeric(28, 10),
	"sell_quantity" numeric(28, 10),
	"net_quantity" numeric(28, 10),
	"buy_value" numeric(28, 10),
	"sell_value" numeric(28, 10),
	"net_value" numeric(28, 10),
	"currency" varchar(3) NOT NULL,
	"as_of" timestamp with time zone NOT NULL,
	"data_cutoff" timestamp with time zone NOT NULL,
	"derived_metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider_id" uuid NOT NULL,
	"provider_dataset" varchar(128) NOT NULL,
	"provider_revision" varchar(128),
	"source_timestamp" timestamp with time zone NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"available_at" timestamp with time zone NOT NULL,
	"delivery_mode" varchar(16) NOT NULL,
	"license_class" varchar(40) NOT NULL,
	"redistribution_classes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"quality_state" varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intelligence_companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_name" varchar(255) NOT NULL,
	"primary_instrument_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intelligence_external_identity_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"entity_type" varchar(32) NOT NULL,
	"external_id" varchar(255) NOT NULL,
	"canonical_entity_id" uuid,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_to" timestamp with time zone,
	"confidence" numeric(5, 4),
	"status" varchar(32) NOT NULL,
	"source" varchar(128) NOT NULL,
	"manual_review_state" varchar(24) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "intelligence_external_identity_resolution_check" CHECK (("intelligence_external_identity_mappings"."status" = 'RESOLVED' and "intelligence_external_identity_mappings"."canonical_entity_id" is not null) or ("intelligence_external_identity_mappings"."status" <> 'RESOLVED')),
	CONSTRAINT "intelligence_external_identity_validity_check" CHECK ("intelligence_external_identity_mappings"."valid_to" is null or "intelligence_external_identity_mappings"."valid_to" >= "intelligence_external_identity_mappings"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "intelligence_funds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(64) NOT NULL,
	"type" varchar(64) NOT NULL,
	"manager_institution_id" uuid,
	"currency" varchar(3) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"benchmark_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intelligence_institutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(32) NOT NULL,
	"canonical_name" varchar(255) NOT NULL,
	"short_name" varchar(128),
	"code" varchar(64),
	"active" boolean DEFAULT true NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "intelligence_institutions_type_check" CHECK ("intelligence_institutions"."type" in ('BROKERAGE','CUSTODIAN','FUND_MANAGER','FUND','FOREIGN_CUSTODIAN','OTHER')),
	CONSTRAINT "intelligence_institutions_validity_check" CHECK ("intelligence_institutions"."valid_to" is null or "intelligence_institutions"."valid_to" >= "intelligence_institutions"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "intelligence_market_events" (
	"revision_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supersedes_revision_id" uuid,
	"correction_reason" text,
	"event_id" uuid NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"entity_type" varchar(32) NOT NULL,
	"entity_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone,
	"published_at" timestamp with time zone NOT NULL,
	"effective_at" timestamp with time zone,
	"source_reference" text NOT NULL,
	"methodology_version" varchar(64),
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider_id" uuid NOT NULL,
	"provider_dataset" varchar(128) NOT NULL,
	"provider_revision" varchar(128),
	"source_timestamp" timestamp with time zone NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"available_at" timestamp with time zone NOT NULL,
	"delivery_mode" varchar(16) NOT NULL,
	"license_class" varchar(40) NOT NULL,
	"redistribution_classes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"quality_state" varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intelligence_market_measures" (
	"revision_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supersedes_revision_id" uuid,
	"correction_reason" text,
	"measure_id" varchar(255) NOT NULL,
	"instrument_id" uuid NOT NULL,
	"type" varchar(48) NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_until" timestamp with time zone,
	"published_at" timestamp with time zone NOT NULL,
	"status" varchar(24) NOT NULL,
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
	CONSTRAINT "intelligence_market_measure_period_check" CHECK ("intelligence_market_measures"."effective_until" is null or "intelligence_market_measures"."effective_until" >= "intelligence_market_measures"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "intelligence_provider_capabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid,
	"capability" varchar(96) NOT NULL,
	"availability" varchar(40) NOT NULL,
	"health" varchar(24) NOT NULL,
	"expected_refresh_cadence_seconds" numeric(12, 0),
	"stale_after_seconds" numeric(12, 0),
	"hard_expire_after_seconds" numeric(12, 0),
	"delayed_by_seconds" numeric(12, 0),
	"checked_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlement_snapshots" (
	"revision_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supersedes_revision_id" uuid,
	"correction_reason" text,
	"instrument_id" uuid NOT NULL,
	"institution_id" uuid NOT NULL,
	"trade_date" date,
	"settlement_date" date NOT NULL,
	"holding_quantity" numeric(28, 10),
	"holding_ratio" numeric(20, 12),
	"change_quantity" numeric(28, 10),
	"change_ratio" numeric(20, 12),
	"residency" varchar(16) NOT NULL,
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
	"quality_state" varchar(32) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "corporate_disclosure_revisions" ADD CONSTRAINT "corporate_disclosure_revisions_company_id_intelligence_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."intelligence_companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_disclosure_revisions" ADD CONSTRAINT "corporate_disclosure_revisions_provider_id_data_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "derivative_contracts" ADD CONSTRAINT "derivative_contracts_underlying_instrument_id_instruments_id_fk" FOREIGN KEY ("underlying_instrument_id") REFERENCES "public"."instruments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_holding_revisions" ADD CONSTRAINT "fund_holding_revisions_fund_id_intelligence_funds_id_fk" FOREIGN KEY ("fund_id") REFERENCES "public"."intelligence_funds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_holding_revisions" ADD CONSTRAINT "fund_holding_revisions_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_holding_revisions" ADD CONSTRAINT "fund_holding_revisions_provider_id_data_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institutional_flow_observations" ADD CONSTRAINT "institutional_flow_observations_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institutional_flow_observations" ADD CONSTRAINT "institutional_flow_observations_institution_id_intelligence_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."intelligence_institutions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institutional_flow_observations" ADD CONSTRAINT "institutional_flow_observations_provider_id_data_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligence_companies" ADD CONSTRAINT "intelligence_companies_primary_instrument_id_instruments_id_fk" FOREIGN KEY ("primary_instrument_id") REFERENCES "public"."instruments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligence_external_identity_mappings" ADD CONSTRAINT "intelligence_external_identity_mappings_provider_id_data_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligence_funds" ADD CONSTRAINT "intelligence_funds_manager_institution_id_intelligence_institutions_id_fk" FOREIGN KEY ("manager_institution_id") REFERENCES "public"."intelligence_institutions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligence_funds" ADD CONSTRAINT "intelligence_funds_benchmark_id_instruments_id_fk" FOREIGN KEY ("benchmark_id") REFERENCES "public"."instruments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligence_market_events" ADD CONSTRAINT "intelligence_market_events_provider_id_data_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligence_market_measures" ADD CONSTRAINT "intelligence_market_measures_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligence_market_measures" ADD CONSTRAINT "intelligence_market_measures_provider_id_data_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligence_provider_capabilities" ADD CONSTRAINT "intelligence_provider_capabilities_provider_id_data_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_snapshots" ADD CONSTRAINT "settlement_snapshots_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_snapshots" ADD CONSTRAINT "settlement_snapshots_institution_id_intelligence_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."intelligence_institutions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_snapshots" ADD CONSTRAINT "settlement_snapshots_provider_id_data_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "corporate_disclosure_provider_revision_unique" ON "corporate_disclosure_revisions" USING btree ("provider_id","external_disclosure_id","provider_revision");--> statement-breakpoint
CREATE INDEX "corporate_disclosure_company_published_idx" ON "corporate_disclosure_revisions" USING btree ("company_id","published_at");--> statement-breakpoint
CREATE INDEX "corporate_disclosure_type_published_idx" ON "corporate_disclosure_revisions" USING btree ("disclosure_type","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "derivative_contracts_code_expiry_unique" ON "derivative_contracts" USING btree ("contract_code","expiry");--> statement-breakpoint
CREATE INDEX "derivative_contracts_underlying_expiry_idx" ON "derivative_contracts" USING btree ("underlying_instrument_id","expiry");--> statement-breakpoint
CREATE UNIQUE INDEX "fund_holding_natural_revision_unique" ON "fund_holding_revisions" USING btree ("provider_id","fund_id","instrument_id","reporting_date","provider_revision");--> statement-breakpoint
CREATE INDEX "fund_holding_fund_reporting_idx" ON "fund_holding_revisions" USING btree ("fund_id","reporting_date");--> statement-breakpoint
CREATE INDEX "fund_holding_instrument_reporting_idx" ON "fund_holding_revisions" USING btree ("instrument_id","reporting_date");--> statement-breakpoint
CREATE UNIQUE INDEX "institutional_flow_natural_revision_unique" ON "institutional_flow_observations" USING btree ("provider_id","instrument_id","institution_id","trade_date","session","provider_revision");--> statement-breakpoint
CREATE INDEX "institutional_flow_instrument_date_idx" ON "institutional_flow_observations" USING btree ("instrument_id","trade_date");--> statement-breakpoint
CREATE INDEX "institutional_flow_institution_date_idx" ON "institutional_flow_observations" USING btree ("institution_id","trade_date");--> statement-breakpoint
CREATE INDEX "intelligence_companies_instrument_idx" ON "intelligence_companies" USING btree ("primary_instrument_id");--> statement-breakpoint
CREATE UNIQUE INDEX "intelligence_external_identity_period_unique" ON "intelligence_external_identity_mappings" USING btree ("provider_id","entity_type","external_id","valid_from");--> statement-breakpoint
CREATE INDEX "intelligence_external_identity_canonical_idx" ON "intelligence_external_identity_mappings" USING btree ("entity_type","canonical_entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "intelligence_funds_code_unique" ON "intelligence_funds" USING btree ("code");--> statement-breakpoint
CREATE INDEX "intelligence_funds_manager_idx" ON "intelligence_funds" USING btree ("manager_institution_id");--> statement-breakpoint
CREATE UNIQUE INDEX "intelligence_institutions_code_unique" ON "intelligence_institutions" USING btree ("code") WHERE "intelligence_institutions"."code" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "intelligence_market_events_provider_revision_unique" ON "intelligence_market_events" USING btree ("provider_id","event_id","provider_revision");--> statement-breakpoint
CREATE INDEX "intelligence_market_events_entity_published_idx" ON "intelligence_market_events" USING btree ("entity_type","entity_id","published_at");--> statement-breakpoint
CREATE INDEX "intelligence_market_events_type_available_idx" ON "intelligence_market_events" USING btree ("event_type","available_at");--> statement-breakpoint
CREATE UNIQUE INDEX "intelligence_market_measure_revision_unique" ON "intelligence_market_measures" USING btree ("provider_id","measure_id","provider_revision");--> statement-breakpoint
CREATE INDEX "intelligence_market_measure_instrument_period_idx" ON "intelligence_market_measures" USING btree ("instrument_id","effective_from","effective_until");--> statement-breakpoint
CREATE UNIQUE INDEX "intelligence_provider_capability_unique" ON "intelligence_provider_capabilities" USING btree ("provider_id","capability");--> statement-breakpoint
CREATE INDEX "intelligence_provider_capability_state_idx" ON "intelligence_provider_capabilities" USING btree ("capability","availability","health");--> statement-breakpoint
CREATE UNIQUE INDEX "settlement_snapshot_natural_revision_unique" ON "settlement_snapshots" USING btree ("provider_id","instrument_id","institution_id","settlement_date","provider_revision");--> statement-breakpoint
CREATE INDEX "settlement_snapshot_instrument_date_idx" ON "settlement_snapshots" USING btree ("instrument_id","settlement_date");--> statement-breakpoint
CREATE INDEX "settlement_snapshot_institution_date_idx" ON "settlement_snapshots" USING btree ("institution_id","settlement_date");
--> statement-breakpoint
ALTER TABLE "corporate_disclosure_revisions" ADD CONSTRAINT "corporate_disclosure_supersedes_fk" FOREIGN KEY ("supersedes_revision_id") REFERENCES "public"."corporate_disclosure_revisions"("revision_id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "fund_holding_revisions" ADD CONSTRAINT "fund_holding_supersedes_fk" FOREIGN KEY ("supersedes_revision_id") REFERENCES "public"."fund_holding_revisions"("revision_id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "institutional_flow_observations" ADD CONSTRAINT "institutional_flow_supersedes_fk" FOREIGN KEY ("supersedes_revision_id") REFERENCES "public"."institutional_flow_observations"("revision_id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "intelligence_market_events" ADD CONSTRAINT "intelligence_market_event_supersedes_fk" FOREIGN KEY ("supersedes_revision_id") REFERENCES "public"."intelligence_market_events"("revision_id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "intelligence_market_measures" ADD CONSTRAINT "intelligence_market_measure_supersedes_fk" FOREIGN KEY ("supersedes_revision_id") REFERENCES "public"."intelligence_market_measures"("revision_id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "settlement_snapshots" ADD CONSTRAINT "settlement_snapshot_supersedes_fk" FOREIGN KEY ("supersedes_revision_id") REFERENCES "public"."settlement_snapshots"("revision_id") ON DELETE restrict;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_intelligence_revision_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'intelligence revisions are immutable';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER prevent_corporate_disclosure_revision_mutation BEFORE UPDATE OR DELETE ON "corporate_disclosure_revisions" FOR EACH ROW EXECUTE FUNCTION prevent_intelligence_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER prevent_fund_holding_revision_mutation BEFORE UPDATE OR DELETE ON "fund_holding_revisions" FOR EACH ROW EXECUTE FUNCTION prevent_intelligence_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER prevent_institutional_flow_revision_mutation BEFORE UPDATE OR DELETE ON "institutional_flow_observations" FOR EACH ROW EXECUTE FUNCTION prevent_intelligence_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER prevent_intelligence_market_event_mutation BEFORE UPDATE OR DELETE ON "intelligence_market_events" FOR EACH ROW EXECUTE FUNCTION prevent_intelligence_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER prevent_intelligence_market_measure_mutation BEFORE UPDATE OR DELETE ON "intelligence_market_measures" FOR EACH ROW EXECUTE FUNCTION prevent_intelligence_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER prevent_settlement_snapshot_mutation BEFORE UPDATE OR DELETE ON "settlement_snapshots" FOR EACH ROW EXECUTE FUNCTION prevent_intelligence_revision_mutation();
