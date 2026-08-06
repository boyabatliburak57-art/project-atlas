DROP TABLE IF EXISTS "email_verification_tokens";
ALTER TABLE "security_users" DROP COLUMN IF EXISTS "email_verification_version";
ALTER TABLE "security_users" DROP COLUMN IF EXISTS "email_verified_at";
