CREATE TABLE "support_attachment_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"storage_key" varchar(320) NOT NULL,
	"filename" varchar(180) NOT NULL,
	"content_type" varchar(80) NOT NULL,
	"byte_size" bigint NOT NULL,
	"checksum_sha256" varchar(64) NOT NULL,
	"malware_scan_status" varchar(24) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_attachments_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "support_attachments_size_check" CHECK ("support_attachment_references"."byte_size" between 1 and 5242880),
	CONSTRAINT "support_attachments_checksum_check" CHECK ("support_attachment_references"."checksum_sha256" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "support_attachments_scan_check" CHECK ("support_attachment_references"."malware_scan_status" in ('pending','clean','rejected','failed'))
);
--> statement-breakpoint
CREATE TABLE "support_request_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"kind" varchar(32) NOT NULL,
	"message" varchar(8000),
	"from_status" varchar(32),
	"to_status" varchar(32),
	"user_visible" varchar(5) DEFAULT 'true' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_request_events_kind_check" CHECK ("support_request_events"."kind" in ('created','userMessage','internalNote','statusChanged','assigned','attachmentAdded','correctionLinked','reopened')),
	CONSTRAINT "support_request_events_visibility_check" CHECK ("support_request_events"."user_visible" in ('true','false'))
);
--> statement-breakpoint
CREATE TABLE "support_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"type" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"subject" varchar(160) NOT NULL,
	"description" varchar(8000) NOT NULL,
	"data_issue" jsonb,
	"assigned_admin_user_id" uuid,
	"correction_request_id" uuid,
	"reference_code" varchar(40) NOT NULL,
	"correlation_id" varchar(128) NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	"sla_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "support_requests_reference_unique" UNIQUE("reference_code"),
	CONSTRAINT "support_requests_type_check" CHECK ("support_requests"."type" in ('bugReport','featureFeedback','dataIssue','accountSupport','securitySupport','other')),
	CONSTRAINT "support_requests_status_check" CHECK ("support_requests"."status" in ('open','acknowledged','investigating','waitingForUser','resolved','closed','rejected')),
	CONSTRAINT "support_requests_version_check" CHECK ("support_requests"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "support_attachment_references" ADD CONSTRAINT "support_attachment_references_request_id_support_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."support_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_attachment_references" ADD CONSTRAINT "support_attachment_references_owner_user_id_security_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."security_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_request_events" ADD CONSTRAINT "support_request_events_request_id_support_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."support_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_request_events" ADD CONSTRAINT "support_request_events_actor_user_id_security_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."security_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_owner_user_id_security_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."security_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_assigned_admin_user_id_security_users_id_fk" FOREIGN KEY ("assigned_admin_user_id") REFERENCES "public"."security_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_attachments_request_idx" ON "support_attachment_references" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "support_request_events_request_created_idx" ON "support_request_events" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE INDEX "support_requests_owner_updated_idx" ON "support_requests" USING btree ("owner_user_id","updated_at");--> statement-breakpoint
CREATE INDEX "support_requests_queue_idx" ON "support_requests" USING btree ("status","updated_at");