CREATE TABLE "communication_delivery_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" uuid NOT NULL,
	"attempt" integer NOT NULL,
	"provider_key" varchar(80) NOT NULL,
	"provider_message_id_hash" varchar(64),
	"status" varchar(24) NOT NULL,
	"error_code" varchar(80),
	"retryable" varchar(8) NOT NULL,
	"response_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "communication_delivery_attempts_delivery_attempt_unique" UNIQUE("delivery_id","attempt"),
	CONSTRAINT "communication_delivery_attempts_status_check" CHECK ("communication_delivery_attempts"."status" in ('started', 'delivered', 'retry_scheduled', 'failed', 'bounced', 'complained')),
	CONSTRAINT "communication_delivery_attempts_retryable_check" CHECK ("communication_delivery_attempts"."retryable" in ('true', 'false')),
	CONSTRAINT "communication_delivery_attempts_attempt_check" CHECK ("communication_delivery_attempts"."attempt" > 0),
	CONSTRAINT "communication_delivery_attempts_message_hash_check" CHECK ("communication_delivery_attempts"."provider_message_id_hash" is null or "communication_delivery_attempts"."provider_message_id_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "communication_delivery_attempts_metadata_size_check" CHECK (octet_length("communication_delivery_attempts"."response_metadata"::text) <= 8192)
);
--> statement-breakpoint
CREATE TABLE "communication_provider_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_key" varchar(80) NOT NULL,
	"provider_event_id_hash" varchar(64) NOT NULL,
	"provider_message_id_hash" varchar(64) NOT NULL,
	"event_type" varchar(24) NOT NULL,
	"signature_version" varchar(24) NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "communication_provider_events_provider_event_unique" UNIQUE("provider_key","provider_event_id_hash"),
	CONSTRAINT "communication_provider_events_type_check" CHECK ("communication_provider_events"."event_type" in ('bounce', 'complaint')),
	CONSTRAINT "communication_provider_events_hash_check" CHECK ("communication_provider_events"."provider_event_id_hash" ~ '^[a-f0-9]{64}$'
          and "communication_provider_events"."provider_message_id_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TABLE "communication_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(80) NOT NULL,
	"version" integer NOT NULL,
	"locale" varchar(16) NOT NULL,
	"category" varchar(32) NOT NULL,
	"subject_template" varchar(255) NOT NULL,
	"text_template" text NOT NULL,
	"html_template" text NOT NULL,
	"variable_names" jsonb NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "communication_templates_code_version_locale_unique" UNIQUE("code","version","locale"),
	CONSTRAINT "communication_templates_category_check" CHECK ("communication_templates"."category" in ('security', 'transactional', 'alert', 'lifecycle', 'optional')),
	CONSTRAINT "communication_templates_hash_check" CHECK ("communication_templates"."content_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "communication_templates_no_active_content_check" CHECK ("communication_templates"."html_template" !~* '<[[:space:]]*(script|iframe|object|embed|form|style|link|meta)'
          and "communication_templates"."html_template" !~* 'on[a-z]+[[:space:]]*='
          and "communication_templates"."html_template" !~* '(javascript|data):'),
	CONSTRAINT "communication_templates_payload_size_check" CHECK (octet_length("communication_templates"."text_template") <= 65536
          and octet_length("communication_templates"."html_template") <= 131072
          and octet_length("communication_templates"."variable_names"::text) <= 8192)
);
--> statement-breakpoint
ALTER TABLE "communication_delivery_attempts" ADD CONSTRAINT "communication_delivery_attempts_delivery_id_notification_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."notification_deliveries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "communication_delivery_attempts_status_started_idx" ON "communication_delivery_attempts" USING btree ("status","started_at");--> statement-breakpoint
CREATE INDEX "communication_delivery_attempts_message_hash_idx" ON "communication_delivery_attempts" USING btree ("provider_message_id_hash");--> statement-breakpoint
CREATE INDEX "communication_provider_events_message_idx" ON "communication_provider_events" USING btree ("provider_message_id_hash","occurred_at");--> statement-breakpoint
CREATE INDEX "communication_templates_category_code_idx" ON "communication_templates" USING btree ("category","code");