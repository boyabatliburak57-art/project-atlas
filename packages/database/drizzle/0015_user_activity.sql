CREATE TABLE "user_activity_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "event_type" varchar(64) NOT NULL,
  "source_type" varchar(48) NOT NULL,
  "source_id" uuid,
  "status" varchar(32) NOT NULL,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
  "summary" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "deduplication_key" varchar(160) NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_activity_events_user_id_security_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."security_users"("id")
    ON DELETE cascade,
  CONSTRAINT "user_activity_events_summary_not_blank"
    CHECK (length(trim("summary")) > 0),
  CONSTRAINT "user_activity_events_metadata_size"
    CHECK (octet_length("metadata"::text) <= 4096)
);
CREATE UNIQUE INDEX "user_activity_events_user_dedup_unique"
  ON "user_activity_events" ("user_id", "deduplication_key");
CREATE INDEX "user_activity_events_user_cursor_idx"
  ON "user_activity_events" ("user_id", "occurred_at" DESC, "id" DESC);
CREATE INDEX "user_activity_events_expiry_idx"
  ON "user_activity_events" ("expires_at");
