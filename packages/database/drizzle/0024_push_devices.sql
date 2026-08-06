CREATE TABLE "push_devices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_user_id" uuid NOT NULL,
  "installation_id" varchar(160) NOT NULL,
  "platform" varchar(16) NOT NULL,
  "environment" varchar(24) NOT NULL,
  "token_hash" varchar(64) NOT NULL,
  "token_ciphertext" text NOT NULL,
  "permission_status" varchar(24) NOT NULL,
  "app_version" varchar(32) NOT NULL,
  "locale" varchar(16) NOT NULL,
  "timezone" varchar(64) NOT NULL,
  "last_seen_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "push_devices_platform_check" CHECK ("platform" = 'ios'),
  CONSTRAINT "push_devices_environment_check" CHECK ("environment" in ('development', 'production')),
  CONSTRAINT "push_devices_permission_check" CHECK ("permission_status" in ('notDetermined', 'granted', 'denied', 'provisional', 'unavailable')),
  CONSTRAINT "push_devices_token_hash_check" CHECK (length("token_hash") = 64)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "push_devices_owner_installation_unique" ON "push_devices" USING btree ("owner_user_id", "installation_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "push_devices_environment_token_hash_unique" ON "push_devices" USING btree ("environment", "token_hash");
--> statement-breakpoint
CREATE INDEX "push_devices_owner_revoked_idx" ON "push_devices" USING btree ("owner_user_id", "revoked_at");
