import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  jsonb,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { securityUsers } from './security';

export const supportRequests = pgTable(
  'support_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => securityUsers.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 32 }).notNull(),
    status: varchar('status', { length: 32 }).default('open').notNull(),
    subject: varchar('subject', { length: 160 }).notNull(),
    description: varchar('description', { length: 8_000 }).notNull(),
    dataIssue: jsonb('data_issue').$type<Record<string, unknown> | null>(),
    assignedAdminUserId: uuid('assigned_admin_user_id').references(
      () => securityUsers.id,
      { onDelete: 'set null' },
    ),
    correctionRequestId: uuid('correction_request_id'),
    referenceCode: varchar('reference_code', { length: 40 }).notNull(),
    correlationId: varchar('correlation_id', { length: 128 }).notNull(),
    version: bigint('version', { mode: 'number' }).default(1).notNull(),
    slaMetadata: jsonb('sla_metadata').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
  },
  (table) => [
    unique('support_requests_reference_unique').on(table.referenceCode),
    index('support_requests_owner_updated_idx').on(
      table.ownerUserId,
      table.updatedAt,
    ),
    index('support_requests_queue_idx').on(table.status, table.updatedAt),
    check(
      'support_requests_type_check',
      sql`${table.type} in ('bugReport','featureFeedback','dataIssue','accountSupport','securitySupport','other')`,
    ),
    check(
      'support_requests_status_check',
      sql`${table.status} in ('open','acknowledged','investigating','waitingForUser','resolved','closed','rejected')`,
    ),
    check('support_requests_version_check', sql`${table.version} > 0`),
  ],
);

export const supportRequestEvents = pgTable(
  'support_request_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => supportRequests.id, { onDelete: 'cascade' }),
    actorUserId: uuid('actor_user_id')
      .notNull()
      .references(() => securityUsers.id, { onDelete: 'restrict' }),
    kind: varchar('kind', { length: 32 }).notNull(),
    message: varchar('message', { length: 8_000 }),
    fromStatus: varchar('from_status', { length: 32 }),
    toStatus: varchar('to_status', { length: 32 }),
    userVisible: varchar('user_visible', { length: 5 })
      .default('true')
      .notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('support_request_events_request_created_idx').on(
      table.requestId,
      table.createdAt,
    ),
    check(
      'support_request_events_kind_check',
      sql`${table.kind} in ('created','userMessage','internalNote','statusChanged','assigned','attachmentAdded','correctionLinked','reopened')`,
    ),
    check(
      'support_request_events_visibility_check',
      sql`${table.userVisible} in ('true','false')`,
    ),
  ],
);

export const supportAttachmentReferences = pgTable(
  'support_attachment_references',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => supportRequests.id, { onDelete: 'cascade' }),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => securityUsers.id, { onDelete: 'cascade' }),
    storageKey: varchar('storage_key', { length: 320 }).notNull(),
    filename: varchar('filename', { length: 180 }).notNull(),
    contentType: varchar('content_type', { length: 80 }).notNull(),
    byteSize: bigint('byte_size', { mode: 'number' }).notNull(),
    checksumSha256: varchar('checksum_sha256', { length: 64 }).notNull(),
    malwareScanStatus: varchar('malware_scan_status', { length: 24 })
      .default('pending')
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('support_attachments_storage_key_unique').on(table.storageKey),
    index('support_attachments_request_idx').on(table.requestId),
    check(
      'support_attachments_size_check',
      sql`${table.byteSize} between 1 and 5242880`,
    ),
    check(
      'support_attachments_checksum_check',
      sql`${table.checksumSha256} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      'support_attachments_scan_check',
      sql`${table.malwareScanStatus} in ('pending','clean','rejected','failed')`,
    ),
  ],
);

export const supportSchema = {
  supportAttachmentReferences,
  supportRequestEvents,
  supportRequests,
};
