CREATE TABLE "corporate_disclosure_revision_links" (
	"child_revision_id" uuid PRIMARY KEY NOT NULL,
	"parent_revision_id" uuid,
	"supersedes_provider_revision" varchar(128) NOT NULL,
	"resolution_state" varchar(32) DEFAULT 'AWAITING_PREVIOUS_REVISION' NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "corporate_disclosure_revision_resolution_check" CHECK (("corporate_disclosure_revision_links"."resolution_state" = 'COMPLETE' and "corporate_disclosure_revision_links"."parent_revision_id" is not null and "corporate_disclosure_revision_links"."resolved_at" is not null)
        or ("corporate_disclosure_revision_links"."resolution_state" = 'AWAITING_PREVIOUS_REVISION' and "corporate_disclosure_revision_links"."parent_revision_id" is null and "corporate_disclosure_revision_links"."resolved_at" is null))
);
--> statement-breakpoint
ALTER TABLE "corporate_disclosure_revision_links" ADD CONSTRAINT "corporate_disclosure_revision_links_child_revision_id_corporate_disclosure_revisions_revision_id_fk" FOREIGN KEY ("child_revision_id") REFERENCES "public"."corporate_disclosure_revisions"("revision_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_disclosure_revision_links" ADD CONSTRAINT "corporate_disclosure_revision_links_parent_revision_id_corporate_disclosure_revisions_revision_id_fk" FOREIGN KEY ("parent_revision_id") REFERENCES "public"."corporate_disclosure_revisions"("revision_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "corporate_disclosure_revision_parent_idx" ON "corporate_disclosure_revision_links" USING btree ("parent_revision_id");