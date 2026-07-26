CREATE TABLE "user_demo_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"resource_type" varchar(32) NOT NULL,
	"stable_key" varchar(120) NOT NULL,
	"label" varchar(240) NOT NULL,
	"is_demo" boolean DEFAULT true NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"disclaimer" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_demo_resources_owner_key_unique" UNIQUE("owner_user_id","stable_key"),
	CONSTRAINT "user_demo_resources_demo_check" CHECK ("user_demo_resources"."is_demo" = true),
	CONSTRAINT "user_demo_resources_type_check" CHECK ("user_demo_resources"."resource_type" in ('watchlist', 'savedScan', 'portfolio', 'alert', 'strategy', 'backtestResult')),
	CONSTRAINT "user_demo_resources_payload_check" CHECK (octet_length("user_demo_resources"."payload"::text) <= 32768
        and octet_length("user_demo_resources"."disclaimer") between 1 and 2048)
);
--> statement-breakpoint
ALTER TABLE "user_demo_resources" ADD CONSTRAINT "user_demo_resources_owner_user_id_security_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."security_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_demo_resources_owner_type_idx" ON "user_demo_resources" USING btree ("owner_user_id","resource_type");