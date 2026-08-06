ALTER TABLE "security_users" ADD COLUMN "email_verified_at" timestamp with time zone DEFAULT now();
ALTER TABLE "security_users" ADD COLUMN "email_verification_version" integer DEFAULT 1 NOT NULL;
UPDATE "security_users" SET "email_verified_at" = COALESCE("email_verified_at", "created_at");

CREATE TABLE "email_verification_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "security_users"("id") ON DELETE cascade,
  "token_hash" varchar(64) NOT NULL,
  "email_verification_version" integer NOT NULL,
  "purpose" varchar(32) DEFAULT 'EMAIL_VERIFICATION' NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "requested_from_context" varchar(64) DEFAULT 'authenticated' NOT NULL,
  "delivery_attempt_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "email_verification_tokens_hash_unique" UNIQUE("token_hash"),
  CONSTRAINT "email_verification_tokens_purpose_check" CHECK ("purpose" = 'EMAIL_VERIFICATION'),
  CONSTRAINT "email_verification_tokens_expiry_check" CHECK ("expires_at" > "created_at")
);
CREATE INDEX "email_verification_tokens_user_active_idx" ON "email_verification_tokens" ("user_id", "revoked_at", "expires_at");
