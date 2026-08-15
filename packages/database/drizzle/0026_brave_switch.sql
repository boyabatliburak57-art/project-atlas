CREATE TABLE "corporate_disclosure_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"disclosure_revision_id" uuid NOT NULL,
	"entity_type" varchar(16) NOT NULL,
	"company_id" uuid,
	"instrument_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "corporate_disclosure_entity_shape_check" CHECK (("corporate_disclosure_entities"."entity_type" = 'COMPANY' and "corporate_disclosure_entities"."company_id" is not null and "corporate_disclosure_entities"."instrument_id" is null)
        or ("corporate_disclosure_entities"."entity_type" = 'INSTRUMENT' and "corporate_disclosure_entities"."instrument_id" is not null and "corporate_disclosure_entities"."company_id" is null))
);
--> statement-breakpoint
ALTER TABLE "corporate_disclosure_revisions" ADD COLUMN "state" varchar(24) DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "corporate_disclosure_entities" ADD CONSTRAINT "corporate_disclosure_entities_disclosure_revision_id_corporate_disclosure_revisions_revision_id_fk" FOREIGN KEY ("disclosure_revision_id") REFERENCES "public"."corporate_disclosure_revisions"("revision_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_disclosure_entities" ADD CONSTRAINT "corporate_disclosure_entities_company_id_intelligence_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."intelligence_companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_disclosure_entities" ADD CONSTRAINT "corporate_disclosure_entities_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "corporate_disclosure_entity_company_unique" ON "corporate_disclosure_entities" USING btree ("disclosure_revision_id","company_id") WHERE "corporate_disclosure_entities"."entity_type" = 'COMPANY';--> statement-breakpoint
CREATE UNIQUE INDEX "corporate_disclosure_entity_instrument_unique" ON "corporate_disclosure_entities" USING btree ("disclosure_revision_id","instrument_id") WHERE "corporate_disclosure_entities"."entity_type" = 'INSTRUMENT';--> statement-breakpoint
CREATE INDEX "corporate_disclosure_entity_company_idx" ON "corporate_disclosure_entities" USING btree ("company_id","disclosure_revision_id");--> statement-breakpoint
CREATE INDEX "corporate_disclosure_entity_instrument_idx" ON "corporate_disclosure_entities" USING btree ("instrument_id","disclosure_revision_id");--> statement-breakpoint
ALTER TABLE "corporate_disclosure_revisions" ADD CONSTRAINT "corporate_disclosure_state_check" CHECK ("corporate_disclosure_revisions"."state" in ('ACTIVE','CORRECTED','SUPERSEDED','WITHDRAWN'));