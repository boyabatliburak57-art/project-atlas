ALTER TABLE "portfolio_import_jobs" ADD COLUMN "content_type" varchar(128) DEFAULT 'text/csv' NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolio_import_jobs" ADD COLUMN "file_size" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolio_import_jobs" ADD COLUMN "encoding" varchar(16) DEFAULT 'utf-8' NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolio_import_jobs" ADD COLUMN "delimiter" char(1) DEFAULT ',' NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolio_import_jobs" ADD COLUMN "preview_hash" varchar(128) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolio_import_jobs" ADD COLUMN "preview_request_hash" varchar(128) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolio_import_jobs" ADD COLUMN "commit_idempotency_key_hash" varchar(128);--> statement-breakpoint
ALTER TABLE "portfolio_import_jobs" ADD COLUMN "commit_request_hash" varchar(128);--> statement-breakpoint
ALTER TABLE "portfolio_import_jobs" ADD COLUMN "error_summary" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolio_import_jobs" ADD CONSTRAINT "portfolio_import_jobs_file_metadata_check" CHECK ("portfolio_import_jobs"."file_size" >= 0 and "portfolio_import_jobs"."encoding" = 'utf-8' and ("portfolio_import_jobs"."delimiter" = ',' or ascii("portfolio_import_jobs"."delimiter") = 59) and length(trim("portfolio_import_jobs"."preview_hash")) > 0 and length(trim("portfolio_import_jobs"."preview_request_hash")) > 0);--> statement-breakpoint
ALTER TABLE "portfolio_import_jobs" ADD CONSTRAINT "portfolio_import_jobs_commit_identity_check" CHECK (("portfolio_import_jobs"."commit_idempotency_key_hash" is null) = ("portfolio_import_jobs"."commit_request_hash" is null));
