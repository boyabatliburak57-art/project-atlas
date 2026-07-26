CREATE TABLE "legal_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_type" varchar(64) NOT NULL,
	"version" integer NOT NULL,
	"locale" varchar(16) NOT NULL,
	"title" varchar(240) NOT NULL,
	"content" text NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"material_change" boolean DEFAULT true NOT NULL,
	"effective_at" timestamp with time zone,
	"legal_review_reference" varchar(240),
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"published_by_user_id" uuid,
	"published_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	"row_version" integer DEFAULT 1 NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "legal_documents_type_version_locale_unique" UNIQUE("document_type","version","locale"),
	CONSTRAINT "legal_documents_version_check" CHECK ("legal_documents"."version" > 0),
	CONSTRAINT "legal_documents_row_version_check" CHECK ("legal_documents"."row_version" > 0),
	CONSTRAINT "legal_documents_type_check" CHECK ("legal_documents"."document_type" in ('termsOfUse', 'privacyNotice', 'investmentRiskDisclosure', 'dataSourceMethodologyNotice', 'acceptableUsePolicy', 'cookieConsentNotice', 'accountDeletionDataExportNotice')),
	CONSTRAINT "legal_documents_status_check" CHECK ("legal_documents"."status" in ('draft', 'legalReviewRequired', 'approved', 'published', 'retired')),
	CONSTRAINT "legal_documents_review_check" CHECK (("legal_documents"."status" not in ('approved', 'published', 'retired'))
        or ("legal_documents"."reviewed_at" is not null and "legal_documents"."reviewed_by_user_id" is not null
          and "legal_documents"."legal_review_reference" is not null)),
	CONSTRAINT "legal_documents_publish_check" CHECK (("legal_documents"."status" <> 'published')
        or ("legal_documents"."published_at" is not null and "legal_documents"."published_by_user_id" is not null
          and "legal_documents"."effective_at" is not null)),
	CONSTRAINT "legal_documents_content_check" CHECK (octet_length("legal_documents"."content") between 1 and 262144
        and octet_length("legal_documents"."title") between 1 and 1024)
);
--> statement-breakpoint
CREATE TABLE "user_document_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"document_type" varchar(64) NOT NULL,
	"document_version" integer NOT NULL,
	"locale" varchar(16) NOT NULL,
	"action" varchar(16) DEFAULT 'accepted' NOT NULL,
	"source" varchar(24) NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"consented_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "user_document_consents_acceptance_unique" UNIQUE("user_id","document_id","action"),
	CONSTRAINT "user_document_consents_action_check" CHECK ("user_document_consents"."action" in ('accepted', 'withdrawn')),
	CONSTRAINT "user_document_consents_source_check" CHECK ("user_document_consents"."source" in ('registration', 'onboarding', 'settings', 'reconsent')),
	CONSTRAINT "user_document_consents_withdraw_check" CHECK (("user_document_consents"."action" = 'withdrawn' and "user_document_consents"."withdrawn_at" is not null)
        or ("user_document_consents"."action" = 'accepted' and "user_document_consents"."withdrawn_at" is null)),
	CONSTRAINT "user_document_consents_snapshot_check" CHECK ("user_document_consents"."document_version" > 0 and octet_length("user_document_consents"."evidence"::text) <= 4096)
);
--> statement-breakpoint
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_documents_reviewed_by_user_id_security_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."security_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_documents_published_by_user_id_security_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."security_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_documents_created_by_user_id_security_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."security_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_document_consents" ADD CONSTRAINT "user_document_consents_user_id_security_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."security_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_document_consents" ADD CONSTRAINT "user_document_consents_document_id_legal_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."legal_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "legal_documents_publication_idx" ON "legal_documents" USING btree ("document_type","locale","status","effective_at");--> statement-breakpoint
CREATE INDEX "user_document_consents_user_created_idx" ON "user_document_consents" USING btree ("user_id","consented_at");--> statement-breakpoint
CREATE FUNCTION protect_published_legal_document() RETURNS trigger AS $$
BEGIN
  IF OLD.status IN ('published', 'retired') AND (
    NEW.document_type IS DISTINCT FROM OLD.document_type OR
    NEW.version IS DISTINCT FROM OLD.version OR
    NEW.locale IS DISTINCT FROM OLD.locale OR
    NEW.title IS DISTINCT FROM OLD.title OR
    NEW.content IS DISTINCT FROM OLD.content OR
    NEW.content_hash IS DISTINCT FROM OLD.content_hash OR
    NEW.material_change IS DISTINCT FROM OLD.material_change OR
    NEW.effective_at IS DISTINCT FROM OLD.effective_at OR
    NEW.legal_review_reference IS DISTINCT FROM OLD.legal_review_reference OR
    NEW.reviewed_by_user_id IS DISTINCT FROM OLD.reviewed_by_user_id OR
    NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at OR
    NEW.published_by_user_id IS DISTINCT FROM OLD.published_by_user_id OR
    NEW.published_at IS DISTINCT FROM OLD.published_at
  ) THEN
    RAISE EXCEPTION 'PUBLISHED_LEGAL_DOCUMENT_IMMUTABLE';
  END IF;
  IF OLD.status = 'retired' AND NEW.status <> 'retired' THEN
    RAISE EXCEPTION 'RETIRED_LEGAL_DOCUMENT_IMMUTABLE';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER legal_documents_published_immutable
BEFORE UPDATE ON legal_documents
FOR EACH ROW EXECUTE FUNCTION protect_published_legal_document();--> statement-breakpoint
INSERT INTO legal_documents
  (document_type, version, locale, title, content, content_hash, status, material_change)
VALUES
  ('termsOfUse', 1, 'tr-TR', 'Kullanım Koşulları', E'LEGAL_REVIEW_REQUIRED\nNOT_FOR_PRODUCTION_PUBLICATION', 'f298368f8d3984b7bb123a494e99c9db8de469bddced6687e93463c42c80b108', 'legalReviewRequired', true),
  ('privacyNotice', 1, 'tr-TR', 'Gizlilik Bildirimi', E'LEGAL_REVIEW_REQUIRED\nNOT_FOR_PRODUCTION_PUBLICATION', 'f298368f8d3984b7bb123a494e99c9db8de469bddced6687e93463c42c80b108', 'legalReviewRequired', true),
  ('investmentRiskDisclosure', 1, 'tr-TR', 'Yatırım Riski Açıklaması', E'LEGAL_REVIEW_REQUIRED\nNOT_FOR_PRODUCTION_PUBLICATION', 'f298368f8d3984b7bb123a494e99c9db8de469bddced6687e93463c42c80b108', 'legalReviewRequired', true),
  ('dataSourceMethodologyNotice', 1, 'tr-TR', 'Veri Kaynağı ve Metodoloji Bildirimi', E'LEGAL_REVIEW_REQUIRED\nNOT_FOR_PRODUCTION_PUBLICATION', 'f298368f8d3984b7bb123a494e99c9db8de469bddced6687e93463c42c80b108', 'legalReviewRequired', true),
  ('acceptableUsePolicy', 1, 'tr-TR', 'Kabul Edilebilir Kullanım Politikası', E'LEGAL_REVIEW_REQUIRED\nNOT_FOR_PRODUCTION_PUBLICATION', 'f298368f8d3984b7bb123a494e99c9db8de469bddced6687e93463c42c80b108', 'legalReviewRequired', true),
  ('cookieConsentNotice', 1, 'tr-TR', 'Çerez ve Onay Bildirimi', E'LEGAL_REVIEW_REQUIRED\nNOT_FOR_PRODUCTION_PUBLICATION', 'f298368f8d3984b7bb123a494e99c9db8de469bddced6687e93463c42c80b108', 'legalReviewRequired', true),
  ('accountDeletionDataExportNotice', 1, 'tr-TR', 'Hesap Silme ve Veri Dışa Aktarma Bildirimi', E'LEGAL_REVIEW_REQUIRED\nNOT_FOR_PRODUCTION_PUBLICATION', 'f298368f8d3984b7bb123a494e99c9db8de469bddced6687e93463c42c80b108', 'legalReviewRequired', true);
