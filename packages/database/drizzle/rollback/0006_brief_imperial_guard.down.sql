-- Destructive rollback for TASK-048 import preview and commit metadata.
-- Drizzle migrations remain forward-only; remove the matching migration journal
-- row only after this rollback when an immediate forward reapplication is required.
ALTER TABLE "portfolio_import_jobs"
  DROP CONSTRAINT IF EXISTS "portfolio_import_jobs_commit_identity_check";
ALTER TABLE "portfolio_import_jobs"
  DROP CONSTRAINT IF EXISTS "portfolio_import_jobs_file_metadata_check";
ALTER TABLE "portfolio_import_jobs"
  DROP COLUMN IF EXISTS "error_summary",
  DROP COLUMN IF EXISTS "commit_request_hash",
  DROP COLUMN IF EXISTS "commit_idempotency_key_hash",
  DROP COLUMN IF EXISTS "preview_request_hash",
  DROP COLUMN IF EXISTS "preview_hash",
  DROP COLUMN IF EXISTS "delimiter",
  DROP COLUMN IF EXISTS "encoding",
  DROP COLUMN IF EXISTS "file_size",
  DROP COLUMN IF EXISTS "content_type";
