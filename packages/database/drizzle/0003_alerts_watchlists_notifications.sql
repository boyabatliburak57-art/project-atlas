CREATE TABLE "alert_evaluations" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "alert_evaluations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"alert_id" uuid NOT NULL,
	"alert_revision" integer NOT NULL,
	"source_event_id" varchar(160) NOT NULL,
	"data_cutoff_at" timestamp with time zone NOT NULL,
	"instrument_id" uuid,
	"timeframe" varchar(16),
	"evaluation_window" varchar(160),
	"status" varchar(24) NOT NULL,
	"reason_code" varchar(64),
	"result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"duration_ms" integer,
	"evaluated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alert_evaluations_id_alert_revision_unique" UNIQUE("id","alert_id","alert_revision"),
	CONSTRAINT "alert_evaluations_status_check" CHECK ("alert_evaluations"."status" in ('matched', 'not_matched', 'not_evaluable', 'failed')),
	CONSTRAINT "alert_evaluations_duration_check" CHECK ("alert_evaluations"."duration_ms" is null or "alert_evaluations"."duration_ms" >= 0)
);
--> statement-breakpoint
CREATE TABLE "alert_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"source_type" varchar(40) NOT NULL,
	"saved_scan_id" uuid,
	"saved_scan_revision" integer,
	"preset_scan_id" uuid,
	"preset_scan_revision" integer,
	"instrument_id" uuid,
	"watchlist_id" uuid,
	"trigger_policy" varchar(32) NOT NULL,
	"repeat_policy" varchar(32) NOT NULL,
	"timeframe" varchar(16),
	"evaluation_mode" varchar(24) DEFAULT 'closed_bar' NOT NULL,
	"source_configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"channels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alert_revisions_alert_revision_unique" UNIQUE("alert_id","revision"),
	CONSTRAINT "alert_revisions_revision_check" CHECK ("alert_revisions"."revision" >= 1),
	CONSTRAINT "alert_revisions_source_type_check" CHECK ("alert_revisions"."source_type" in ('saved_scan', 'preset_scan', 'instrument_price', 'instrument_percent_change', 'instrument_indicator', 'watchlist_saved_scan')),
	CONSTRAINT "alert_revisions_trigger_policy_check" CHECK ("alert_revisions"."trigger_policy" in ('anyMatch', 'newMatch', 'symbolEntered', 'symbolExited', 'thresholdCrossed')),
	CONSTRAINT "alert_revisions_repeat_policy_check" CHECK ("alert_revisions"."repeat_policy" in ('once', 'oncePerClosedBar', 'oncePerDay', 'afterReset', 'everyNewMatch')),
	CONSTRAINT "alert_revisions_evaluation_mode_check" CHECK ("alert_revisions"."evaluation_mode" in ('closed_bar', 'intrabar')),
	CONSTRAINT "alert_revisions_source_reference_check" CHECK (
        ("alert_revisions"."source_type" = 'saved_scan' and "alert_revisions"."saved_scan_id" is not null and "alert_revisions"."saved_scan_revision" is not null and "alert_revisions"."preset_scan_id" is null and "alert_revisions"."instrument_id" is null and "alert_revisions"."watchlist_id" is null)
        or ("alert_revisions"."source_type" = 'preset_scan' and "alert_revisions"."preset_scan_id" is not null and "alert_revisions"."preset_scan_revision" is not null and "alert_revisions"."saved_scan_id" is null and "alert_revisions"."instrument_id" is null and "alert_revisions"."watchlist_id" is null)
        or ("alert_revisions"."source_type" in ('instrument_price', 'instrument_percent_change', 'instrument_indicator') and "alert_revisions"."instrument_id" is not null and "alert_revisions"."saved_scan_id" is null and "alert_revisions"."preset_scan_id" is null and "alert_revisions"."watchlist_id" is null)
        or ("alert_revisions"."source_type" = 'watchlist_saved_scan' and "alert_revisions"."watchlist_id" is not null and "alert_revisions"."saved_scan_id" is not null and "alert_revisions"."saved_scan_revision" is not null and "alert_revisions"."preset_scan_id" is null and "alert_revisions"."instrument_id" is null)
      ),
	CONSTRAINT "alert_revisions_source_revision_check" CHECK (("alert_revisions"."saved_scan_revision" is null or "alert_revisions"."saved_scan_revision" >= 1) and ("alert_revisions"."preset_scan_revision" is null or "alert_revisions"."preset_scan_revision" >= 1))
);
--> statement-breakpoint
CREATE TABLE "alert_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" uuid NOT NULL,
	"alert_revision" integer NOT NULL,
	"state_key" varchar(200) NOT NULL,
	"match_state" varchar(24) DEFAULT 'unknown' NOT NULL,
	"armed" boolean DEFAULT true NOT NULL,
	"state_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_source_event_id" varchar(160),
	"last_data_cutoff_at" timestamp with time zone,
	"last_triggered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alert_states_match_state_check" CHECK ("alert_states"."match_state" in ('unknown', 'matched', 'not_matched', 'not_evaluable')),
	CONSTRAINT "alert_states_state_key_not_blank" CHECK (length(trim("alert_states"."state_key")) > 0)
);
--> statement-breakpoint
CREATE TABLE "alert_triggers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" uuid NOT NULL,
	"alert_revision" integer NOT NULL,
	"evaluation_id" bigint NOT NULL,
	"instrument_id" uuid,
	"trigger_type" varchar(32) NOT NULL,
	"deduplication_key" varchar(255) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alert_triggers_trigger_type_check" CHECK ("alert_triggers"."trigger_type" in ('anyMatch', 'newMatch', 'symbolEntered', 'symbolExited', 'thresholdCrossed')),
	CONSTRAINT "alert_triggers_deduplication_key_not_blank" CHECK (length(trim("alert_triggers"."deduplication_key")) > 0)
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"status" varchar(24) DEFAULT 'active' NOT NULL,
	"current_revision" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "alerts_name_not_blank" CHECK (length(trim("alerts"."name")) > 0),
	CONSTRAINT "alerts_status_check" CHECK ("alerts"."status" in ('active', 'paused', 'invalid', 'deleted')),
	CONSTRAINT "alerts_current_revision_check" CHECK ("alerts"."current_revision" >= 0),
	CONSTRAINT "alerts_deleted_state_check" CHECK (("alerts"."status" = 'deleted') = ("alerts"."deleted_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"channel" varchar(24) NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"status" varchar(24) DEFAULT 'pending' NOT NULL,
	"template_code" varchar(80) NOT NULL,
	"template_version" integer NOT NULL,
	"locale" varchar(16) NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"error_code" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_deliveries_channel_check" CHECK ("notification_deliveries"."channel" in ('email')),
	CONSTRAINT "notification_deliveries_status_check" CHECK ("notification_deliveries"."status" in ('pending', 'processing', 'delivered', 'failed', 'suppressed', 'cancelled')),
	CONSTRAINT "notification_deliveries_counters_check" CHECK ("notification_deliveries"."template_version" >= 1 and "notification_deliveries"."attempt_count" >= 0),
	CONSTRAINT "notification_deliveries_terminal_timestamp_check" CHECK (("notification_deliveries"."status" = 'delivered') = ("notification_deliveries"."delivered_at" is not null) and ("notification_deliveries"."status" = 'failed') = ("notification_deliveries"."failed_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "notification_outbox" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_outbox_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"delivery_id" uuid NOT NULL,
	"status" varchar(24) DEFAULT 'pending' NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" varchar(128),
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_error_code" varchar(64),
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_outbox_status_check" CHECK ("notification_outbox"."status" in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
	CONSTRAINT "notification_outbox_attempts_check" CHECK ("notification_outbox"."attempt_count" >= 0 and "notification_outbox"."max_attempts" >= 1 and "notification_outbox"."attempt_count" <= "notification_outbox"."max_attempts"),
	CONSTRAINT "notification_outbox_lock_check" CHECK (("notification_outbox"."locked_at" is null) = ("notification_outbox"."locked_by" is null))
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"timezone" varchar(64) DEFAULT 'UTC' NOT NULL,
	"locale" varchar(16) DEFAULT 'tr-TR' NOT NULL,
	"email_alerts_enabled" boolean DEFAULT true NOT NULL,
	"daily_digest_enabled" boolean DEFAULT false NOT NULL,
	"scan_completion_enabled" boolean DEFAULT true NOT NULL,
	"quiet_hours_enabled" boolean DEFAULT false NOT NULL,
	"quiet_hours_start_minute" integer,
	"quiet_hours_end_minute" integer,
	"throttle_minutes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_timezone_not_blank" CHECK (length(trim("notification_preferences"."timezone")) > 0),
	CONSTRAINT "notification_preferences_quiet_hours_check" CHECK (
        ("notification_preferences"."quiet_hours_enabled" and "notification_preferences"."quiet_hours_start_minute" between 0 and 1439 and "notification_preferences"."quiet_hours_end_minute" between 0 and 1439)
        or (not "notification_preferences"."quiet_hours_enabled" and "notification_preferences"."quiet_hours_start_minute" is null and "notification_preferences"."quiet_hours_end_minute" is null)
      ),
	CONSTRAINT "notification_preferences_throttle_check" CHECK ("notification_preferences"."throttle_minutes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"alert_trigger_id" uuid,
	"type" varchar(40) NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"occurred_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_id_user_unique" UNIQUE("id","user_id"),
	CONSTRAINT "notifications_type_check" CHECK ("notifications"."type" in ('alertTriggered', 'alertDeliveryFailed', 'dataStaleWarning', 'scanCompleted', 'systemAnnouncement', 'security')),
	CONSTRAINT "notifications_expiry_check" CHECK ("notifications"."expires_at" is null or "notifications"."expires_at" >= "notifications"."occurred_at")
);
--> statement-breakpoint
CREATE TABLE "watchlist_item_tags" (
	"watchlist_item_id" uuid NOT NULL,
	"tag" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "watchlist_item_tags_pk" PRIMARY KEY("watchlist_item_id","tag"),
	CONSTRAINT "watchlist_item_tags_tag_not_blank" CHECK (length(trim("watchlist_item_tags"."tag")) > 0)
);
--> statement-breakpoint
CREATE TABLE "watchlist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"watchlist_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"note" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "watchlist_items_sort_order_check" CHECK ("watchlist_items"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "watchlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"visibility" varchar(24) DEFAULT 'private' NOT NULL,
	"status" varchar(24) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "watchlists_name_not_blank" CHECK (length(trim("watchlists"."name")) > 0),
	CONSTRAINT "watchlists_visibility_check" CHECK ("watchlists"."visibility" = 'private'),
	CONSTRAINT "watchlists_status_check" CHECK ("watchlists"."status" in ('active', 'deleted')),
	CONSTRAINT "watchlists_deleted_state_check" CHECK (("watchlists"."status" = 'deleted') = ("watchlists"."deleted_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "alert_evaluations" ADD CONSTRAINT "alert_evaluations_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_evaluations" ADD CONSTRAINT "alert_evaluations_alert_revision_fk" FOREIGN KEY ("alert_id","alert_revision") REFERENCES "public"."alert_revisions"("alert_id","revision") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_revisions" ADD CONSTRAINT "alert_revisions_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_revisions" ADD CONSTRAINT "alert_revisions_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_revisions" ADD CONSTRAINT "alert_revisions_watchlist_id_watchlists_id_fk" FOREIGN KEY ("watchlist_id") REFERENCES "public"."watchlists"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_revisions" ADD CONSTRAINT "alert_revisions_saved_scan_revision_fk" FOREIGN KEY ("saved_scan_id","saved_scan_revision") REFERENCES "public"."saved_scan_revisions"("saved_scan_id","revision") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_revisions" ADD CONSTRAINT "alert_revisions_preset_scan_revision_fk" FOREIGN KEY ("preset_scan_id","preset_scan_revision") REFERENCES "public"."preset_scan_revisions"("preset_scan_id","revision") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_states" ADD CONSTRAINT "alert_states_alert_revision_fk" FOREIGN KEY ("alert_id","alert_revision") REFERENCES "public"."alert_revisions"("alert_id","revision") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_triggers" ADD CONSTRAINT "alert_triggers_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_triggers" ADD CONSTRAINT "alert_triggers_evaluation_identity_fk" FOREIGN KEY ("evaluation_id","alert_id","alert_revision") REFERENCES "public"."alert_evaluations"("id","alert_id","alert_revision") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_owner_fk" FOREIGN KEY ("notification_id","user_id") REFERENCES "public"."notifications"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_delivery_id_notification_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."notification_deliveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_alert_trigger_id_alert_triggers_id_fk" FOREIGN KEY ("alert_trigger_id") REFERENCES "public"."alert_triggers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_item_tags" ADD CONSTRAINT "watchlist_item_tags_watchlist_item_id_watchlist_items_id_fk" FOREIGN KEY ("watchlist_item_id") REFERENCES "public"."watchlist_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_watchlist_id_watchlists_id_fk" FOREIGN KEY ("watchlist_id") REFERENCES "public"."watchlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alert_evaluations_identity_unique" ON "alert_evaluations" USING btree ("alert_id","alert_revision","source_event_id","data_cutoff_at");--> statement-breakpoint
CREATE INDEX "alert_evaluations_alert_evaluated_idx" ON "alert_evaluations" USING btree ("alert_id","evaluated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "alert_evaluations_instrument_cutoff_idx" ON "alert_evaluations" USING btree ("instrument_id","data_cutoff_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "alert_revisions_saved_scan_idx" ON "alert_revisions" USING btree ("saved_scan_id","saved_scan_revision");--> statement-breakpoint
CREATE INDEX "alert_revisions_preset_scan_idx" ON "alert_revisions" USING btree ("preset_scan_id","preset_scan_revision");--> statement-breakpoint
CREATE INDEX "alert_revisions_instrument_timeframe_idx" ON "alert_revisions" USING btree ("instrument_id","timeframe");--> statement-breakpoint
CREATE INDEX "alert_revisions_watchlist_idx" ON "alert_revisions" USING btree ("watchlist_id");--> statement-breakpoint
CREATE UNIQUE INDEX "alert_states_alert_revision_key_unique" ON "alert_states" USING btree ("alert_id","alert_revision","state_key");--> statement-breakpoint
CREATE INDEX "alert_states_alert_updated_idx" ON "alert_states" USING btree ("alert_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "alert_triggers_deduplication_key_unique" ON "alert_triggers" USING btree ("deduplication_key");--> statement-breakpoint
CREATE INDEX "alert_triggers_alert_occurred_idx" ON "alert_triggers" USING btree ("alert_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "alert_triggers_instrument_occurred_idx" ON "alert_triggers" USING btree ("instrument_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "alerts_owner_status_updated_idx" ON "alerts" USING btree ("owner_user_id","status","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "notification_deliveries_channel_idempotency_unique" ON "notification_deliveries" USING btree ("channel","idempotency_key");--> statement-breakpoint
CREATE INDEX "notification_deliveries_user_status_created_idx" ON "notification_deliveries" USING btree ("user_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notification_deliveries_notification_idx" ON "notification_deliveries" USING btree ("notification_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_outbox_delivery_unique" ON "notification_outbox" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "notification_outbox_status_available_idx" ON "notification_outbox" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "notifications_user_read_occurred_idx" ON "notifications" USING btree ("user_id","read_at","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notifications_user_type_occurred_idx" ON "notifications" USING btree ("user_id","type","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notifications_expiry_idx" ON "notifications" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "watchlist_items_watchlist_instrument_unique" ON "watchlist_items" USING btree ("watchlist_id","instrument_id");--> statement-breakpoint
CREATE INDEX "watchlist_items_watchlist_sort_idx" ON "watchlist_items" USING btree ("watchlist_id","sort_order","id");--> statement-breakpoint
CREATE INDEX "watchlist_items_instrument_idx" ON "watchlist_items" USING btree ("instrument_id");--> statement-breakpoint
CREATE INDEX "watchlists_owner_status_updated_idx" ON "watchlists" USING btree ("owner_user_id","status","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE FUNCTION prevent_alert_revision_mutation() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'alert revisions are immutable' USING ERRCODE = '23514';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER alert_revisions_immutable
BEFORE UPDATE OR DELETE ON alert_revisions
FOR EACH ROW EXECUTE FUNCTION prevent_alert_revision_mutation();
