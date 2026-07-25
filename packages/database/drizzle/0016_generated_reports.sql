CREATE TABLE "generated_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_user_id" uuid NOT NULL,
  "report_type" varchar(48) NOT NULL,
  "source_type" varchar(48) NOT NULL,
  "source_id" uuid,
  "status" varchar(24) DEFAULT 'queued' NOT NULL,
  "request_hash" varchar(64) NOT NULL,
  "storage_key" varchar(512),
  "content_type" varchar(128),
  "byte_size" bigint,
  "artifact_payload" bytea,
  "methodology" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "source_revisions" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "data_cutoff_at" timestamp with time zone NOT NULL,
  "generated_at" timestamp with time zone,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "generated_reports_owner_user_id_security_users_id_fk"
    FOREIGN KEY ("owner_user_id") REFERENCES "public"."security_users"("id")
    ON DELETE cascade,
  CONSTRAINT "generated_reports_status_check"
    CHECK ("status" IN ('queued', 'running', 'ready', 'failed', 'cancelled', 'expired', 'deleted')),
  CONSTRAINT "generated_reports_artifact_shape_check"
    CHECK (("status" <> 'ready') OR
      ("storage_key" IS NOT NULL AND "content_type" IS NOT NULL
       AND "byte_size" IS NOT NULL AND "byte_size" > 0
       AND "artifact_payload" IS NOT NULL
       AND octet_length("artifact_payload") = "byte_size")),
  CONSTRAINT "generated_reports_json_size_check"
    CHECK (octet_length("methodology"::text) <= 8192
      AND octet_length("source_revisions"::text) <= 8192
      AND octet_length("warnings"::text) <= 8192)
);
CREATE UNIQUE INDEX "generated_reports_owner_request_unique"
  ON "generated_reports" ("owner_user_id", "request_hash");
CREATE INDEX "generated_reports_owner_status_created_idx"
  ON "generated_reports" ("owner_user_id", "status", "created_at" DESC);
CREATE INDEX "generated_reports_expiry_idx"
  ON "generated_reports" ("expires_at");
