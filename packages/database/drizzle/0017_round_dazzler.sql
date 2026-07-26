CREATE TABLE "data_correction_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"finding_id" uuid NOT NULL,
	"state" varchar(24) DEFAULT 'open' NOT NULL,
	"reason" text NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"reviewed_by_user_id" uuid,
	"target_revision_id" uuid,
	"replay_idempotency_key" varchar(160),
	"correlation_id" varchar(128) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"rebuild_status" varchar(24) DEFAULT 'not_requested' NOT NULL,
	"before_state" jsonb NOT NULL,
	"after_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"failure_code" varchar(80),
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "data_correction_requests_replay_idempotency_unique" UNIQUE("replay_idempotency_key"),
	CONSTRAINT "data_correction_requests_state_check" CHECK ("data_correction_requests"."state" in ('open', 'investigating', 'approved', 'rejected', 'replayQueued', 'replaying', 'resolved', 'failed')),
	CONSTRAINT "data_correction_requests_rebuild_status_check" CHECK ("data_correction_requests"."rebuild_status" in ('not_requested', 'stale', 'rebuilding', 'fresh', 'failed')),
	CONSTRAINT "data_correction_requests_reason_check" CHECK (length(trim("data_correction_requests"."reason")) >= 8 and octet_length("data_correction_requests"."reason") <= 4096),
	CONSTRAINT "data_correction_requests_version_check" CHECK ("data_correction_requests"."version" > 0),
	CONSTRAINT "data_correction_requests_payload_size_check" CHECK (octet_length("data_correction_requests"."before_state"::text) <= 32768
          and octet_length("data_correction_requests"."after_state"::text) <= 32768)
);
--> statement-breakpoint
CREATE TABLE "data_quality_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fingerprint" varchar(64) NOT NULL,
	"finding_type" varchar(64) NOT NULL,
	"severity" varchar(16) NOT NULL,
	"status" varchar(24) DEFAULT 'open' NOT NULL,
	"provider_connection_id" uuid,
	"provider_revision_id" uuid,
	"resource_type" varchar(64) NOT NULL,
	"resource_key" varchar(240) NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurrences" integer DEFAULT 1 NOT NULL,
	"first_detected_at" timestamp with time zone NOT NULL,
	"last_detected_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "data_quality_findings_fingerprint_unique" UNIQUE("fingerprint"),
	CONSTRAINT "data_quality_findings_status_check" CHECK ("data_quality_findings"."status" in ('open', 'investigating', 'resolved', 'suppressed')),
	CONSTRAINT "data_quality_findings_severity_check" CHECK ("data_quality_findings"."severity" in ('info', 'warning', 'critical')),
	CONSTRAINT "data_quality_findings_counters_check" CHECK ("data_quality_findings"."occurrences" > 0 and "data_quality_findings"."version" > 0),
	CONSTRAINT "data_quality_findings_evidence_size_check" CHECK (octet_length("data_quality_findings"."evidence"::text) <= 32768)
);
--> statement-breakpoint
CREATE TABLE "provider_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_key" varchar(80) NOT NULL,
	"environment" varchar(24) NOT NULL,
	"status" varchar(24) DEFAULT 'configured' NOT NULL,
	"credential_reference" varchar(512) NOT NULL,
	"capabilities" jsonb NOT NULL,
	"license_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"health" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_connections_key_environment_unique" UNIQUE("provider_key","environment"),
	CONSTRAINT "provider_connections_status_check" CHECK ("provider_connections"."status" in ('configured', 'healthy', 'degraded', 'unavailable', 'disabled')),
	CONSTRAINT "provider_connections_credential_reference_check" CHECK ("provider_connections"."credential_reference" ~ '^(secret|vault|aws-sm|gcp-sm|azure-kv)://'),
	CONSTRAINT "provider_connections_version_check" CHECK ("provider_connections"."version" > 0),
	CONSTRAINT "provider_connections_payload_size_check" CHECK (octet_length("provider_connections"."capabilities"::text) <= 8192
          and octet_length("provider_connections"."license_metadata"::text) <= 16384
          and octet_length("provider_connections"."health"::text) <= 16384)
);
--> statement-breakpoint
CREATE TABLE "provider_data_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_connection_id" uuid NOT NULL,
	"ingestion_run_id" uuid,
	"capability" varchar(48) NOT NULL,
	"resource_type" varchar(64) NOT NULL,
	"resource_key" varchar(240) NOT NULL,
	"provider_revision" varchar(160) NOT NULL,
	"source_timestamp" timestamp with time zone NOT NULL,
	"available_at" timestamp with time zone NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"supersedes_revision_id" uuid,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_data_revisions_natural_unique" UNIQUE("provider_connection_id","resource_type","resource_key","provider_revision"),
	CONSTRAINT "provider_data_revisions_hash_check" CHECK ("provider_data_revisions"."content_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "provider_data_revisions_evidence_size_check" CHECK (octet_length("provider_data_revisions"."evidence"::text) <= 32768)
);
--> statement-breakpoint
CREATE TABLE "provider_ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_connection_id" uuid NOT NULL,
	"capability" varchar(48) NOT NULL,
	"idempotency_key" varchar(160) NOT NULL,
	"status" varchar(24) NOT NULL,
	"correlation_id" varchar(128) NOT NULL,
	"source_cursor" varchar(512),
	"records_read" integer DEFAULT 0 NOT NULL,
	"records_accepted" integer DEFAULT 0 NOT NULL,
	"records_rejected" integer DEFAULT 0 NOT NULL,
	"error_class" varchar(40),
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "provider_ingestion_runs_connection_idempotency_unique" UNIQUE("provider_connection_id","idempotency_key"),
	CONSTRAINT "provider_ingestion_runs_status_check" CHECK ("provider_ingestion_runs"."status" in ('queued', 'running', 'completed', 'partial', 'failed', 'cancelled')),
	CONSTRAINT "provider_ingestion_runs_counts_check" CHECK ("provider_ingestion_runs"."records_read" >= 0 and "provider_ingestion_runs"."records_accepted" >= 0 and "provider_ingestion_runs"."records_rejected" >= 0),
	CONSTRAINT "provider_ingestion_runs_metadata_size_check" CHECK (octet_length("provider_ingestion_runs"."metadata"::text) <= 32768)
);
--> statement-breakpoint
ALTER TABLE "data_correction_requests" ADD CONSTRAINT "data_correction_requests_finding_id_data_quality_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."data_quality_findings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_correction_requests" ADD CONSTRAINT "data_correction_requests_requested_by_user_id_security_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."security_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_correction_requests" ADD CONSTRAINT "data_correction_requests_reviewed_by_user_id_security_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."security_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_correction_requests" ADD CONSTRAINT "data_correction_requests_target_revision_id_provider_data_revisions_id_fk" FOREIGN KEY ("target_revision_id") REFERENCES "public"."provider_data_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_quality_findings" ADD CONSTRAINT "data_quality_findings_provider_connection_id_provider_connections_id_fk" FOREIGN KEY ("provider_connection_id") REFERENCES "public"."provider_connections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_quality_findings" ADD CONSTRAINT "data_quality_findings_provider_revision_id_provider_data_revisions_id_fk" FOREIGN KEY ("provider_revision_id") REFERENCES "public"."provider_data_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_data_revisions" ADD CONSTRAINT "provider_data_revisions_provider_connection_id_provider_connections_id_fk" FOREIGN KEY ("provider_connection_id") REFERENCES "public"."provider_connections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_data_revisions" ADD CONSTRAINT "provider_data_revisions_ingestion_run_id_provider_ingestion_runs_id_fk" FOREIGN KEY ("ingestion_run_id") REFERENCES "public"."provider_ingestion_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_ingestion_runs" ADD CONSTRAINT "provider_ingestion_runs_provider_connection_id_provider_connections_id_fk" FOREIGN KEY ("provider_connection_id") REFERENCES "public"."provider_connections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "data_correction_requests_state_updated_idx" ON "data_correction_requests" USING btree ("state","updated_at");--> statement-breakpoint
CREATE INDEX "data_quality_findings_status_severity_idx" ON "data_quality_findings" USING btree ("status","severity","last_detected_at");--> statement-breakpoint
CREATE INDEX "provider_connections_status_idx" ON "provider_connections" USING btree ("status");--> statement-breakpoint
CREATE INDEX "provider_data_revisions_resource_available_idx" ON "provider_data_revisions" USING btree ("resource_type","resource_key","available_at");--> statement-breakpoint
CREATE INDEX "provider_ingestion_runs_status_started_idx" ON "provider_ingestion_runs" USING btree ("status","started_at");
