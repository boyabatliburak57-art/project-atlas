import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  customType,
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { securityUsers } from './security';

const bytea = customType<{ data: Buffer }>({
  dataType: () => 'bytea',
});

export const generatedReports = pgTable(
  'generated_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => securityUsers.id, { onDelete: 'cascade' }),
    reportType: varchar('report_type', { length: 48 }).notNull(),
    sourceType: varchar('source_type', { length: 48 }).notNull(),
    sourceId: uuid('source_id'),
    status: varchar('status', { length: 24 }).default('queued').notNull(),
    requestHash: varchar('request_hash', { length: 64 }).notNull(),
    storageKey: varchar('storage_key', { length: 512 }),
    contentType: varchar('content_type', { length: 128 }),
    byteSize: bigint('byte_size', { mode: 'number' }),
    artifactPayload: bytea('artifact_payload'),
    methodology: jsonb('methodology')
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    sourceRevisions: jsonb('source_revisions')
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    warnings: jsonb('warnings')
      .$type<readonly string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    dataCutoffAt: timestamp('data_cutoff_at', { withTimezone: true }).notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('generated_reports_owner_request_unique').on(
      table.ownerUserId,
      table.requestHash,
    ),
    index('generated_reports_owner_status_created_idx').on(
      table.ownerUserId,
      table.status,
      table.createdAt.desc(),
    ),
    index('generated_reports_expiry_idx').on(table.expiresAt),
    check(
      'generated_reports_status_check',
      sql`${table.status} in ('queued', 'running', 'ready', 'failed', 'cancelled', 'expired', 'deleted')`,
    ),
    check(
      'generated_reports_artifact_shape_check',
      sql`(${table.status} <> 'ready') or
        (${table.storageKey} is not null and ${table.contentType} is not null
         and ${table.byteSize} is not null and ${table.byteSize} > 0
         and ${table.artifactPayload} is not null
         and octet_length(${table.artifactPayload}) = ${table.byteSize})`,
    ),
    check(
      'generated_reports_json_size_check',
      sql`octet_length(${table.methodology}::text) <= 8192
        and octet_length(${table.sourceRevisions}::text) <= 8192
        and octet_length(${table.warnings}::text) <= 8192`,
    ),
  ],
);
