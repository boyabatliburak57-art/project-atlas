import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { securityUsers } from './security';

export const legalDocuments = pgTable(
  'legal_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    documentType: varchar('document_type', { length: 64 }).notNull(),
    version: integer('version').notNull(),
    locale: varchar('locale', { length: 16 }).notNull(),
    title: varchar('title', { length: 240 }).notNull(),
    content: text('content').notNull(),
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    status: varchar('status', { length: 32 }).default('draft').notNull(),
    materialChange: boolean('material_change').default(true).notNull(),
    effectiveAt: timestamp('effective_at', { withTimezone: true }),
    legalReviewReference: varchar('legal_review_reference', { length: 240 }),
    reviewedByUserId: uuid('reviewed_by_user_id').references(
      () => securityUsers.id,
      { onDelete: 'set null' },
    ),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    publishedByUserId: uuid('published_by_user_id').references(
      () => securityUsers.id,
      { onDelete: 'set null' },
    ),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    retiredAt: timestamp('retired_at', { withTimezone: true }),
    rowVersion: integer('row_version').default(1).notNull(),
    createdByUserId: uuid('created_by_user_id').references(
      () => securityUsers.id,
      { onDelete: 'set null' },
    ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('legal_documents_type_version_locale_unique').on(
      table.documentType,
      table.version,
      table.locale,
    ),
    index('legal_documents_publication_idx').on(
      table.documentType,
      table.locale,
      table.status,
      table.effectiveAt,
    ),
    check('legal_documents_version_check', sql`${table.version} > 0`),
    check('legal_documents_row_version_check', sql`${table.rowVersion} > 0`),
    check(
      'legal_documents_type_check',
      sql`${table.documentType} in ('termsOfUse', 'privacyNotice', 'investmentRiskDisclosure', 'dataSourceMethodologyNotice', 'acceptableUsePolicy', 'cookieConsentNotice', 'accountDeletionDataExportNotice')`,
    ),
    check(
      'legal_documents_status_check',
      sql`${table.status} in ('draft', 'legalReviewRequired', 'approved', 'published', 'retired')`,
    ),
    check(
      'legal_documents_review_check',
      sql`(${table.status} not in ('approved', 'published', 'retired'))
        or (${table.reviewedAt} is not null and ${table.reviewedByUserId} is not null
          and ${table.legalReviewReference} is not null)`,
    ),
    check(
      'legal_documents_publish_check',
      sql`(${table.status} <> 'published')
        or (${table.publishedAt} is not null and ${table.publishedByUserId} is not null
          and ${table.effectiveAt} is not null)`,
    ),
    check(
      'legal_documents_content_check',
      sql`octet_length(${table.content}) between 1 and 262144
        and octet_length(${table.title}) between 1 and 1024`,
    ),
  ],
);

export const userDocumentConsents = pgTable(
  'user_document_consents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => securityUsers.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id')
      .notNull()
      .references(() => legalDocuments.id, { onDelete: 'restrict' }),
    documentType: varchar('document_type', { length: 64 }).notNull(),
    documentVersion: integer('document_version').notNull(),
    locale: varchar('locale', { length: 16 }).notNull(),
    action: varchar('action', { length: 16 }).default('accepted').notNull(),
    source: varchar('source', { length: 24 }).notNull(),
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    consentedAt: timestamp('consented_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
    evidence: jsonb('evidence')
      .$type<Readonly<Record<string, unknown>>>()
      .default({})
      .notNull(),
  },
  (table) => [
    unique('user_document_consents_acceptance_unique').on(
      table.userId,
      table.documentId,
      table.action,
    ),
    index('user_document_consents_user_created_idx').on(
      table.userId,
      table.consentedAt,
    ),
    check(
      'user_document_consents_action_check',
      sql`${table.action} in ('accepted', 'withdrawn')`,
    ),
    check(
      'user_document_consents_source_check',
      sql`${table.source} in ('registration', 'onboarding', 'settings', 'reconsent')`,
    ),
    check(
      'user_document_consents_withdraw_check',
      sql`(${table.action} = 'withdrawn' and ${table.withdrawnAt} is not null)
        or (${table.action} = 'accepted' and ${table.withdrawnAt} is null)`,
    ),
    check(
      'user_document_consents_snapshot_check',
      sql`${table.documentVersion} > 0 and octet_length(${table.evidence}::text) <= 4096`,
    ),
  ],
);

export const legalConsentTables = {
  legalDocuments,
  userDocumentConsents,
};
