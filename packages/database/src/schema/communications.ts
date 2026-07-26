import { sql } from 'drizzle-orm';
import {
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

import { notificationDeliveries } from './alerts-watchlists-notifications';

export const communicationTemplates = pgTable(
  'communication_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 80 }).notNull(),
    version: integer('version').notNull(),
    locale: varchar('locale', { length: 16 }).notNull(),
    category: varchar('category', { length: 32 }).notNull(),
    subjectTemplate: varchar('subject_template', { length: 255 }).notNull(),
    textTemplate: text('text_template').notNull(),
    htmlTemplate: text('html_template').notNull(),
    variableNames: jsonb('variable_names').$type<readonly string[]>().notNull(),
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('communication_templates_code_version_locale_unique').on(
      table.code,
      table.version,
      table.locale,
    ),
    index('communication_templates_category_code_idx').on(
      table.category,
      table.code,
    ),
    check(
      'communication_templates_category_check',
      sql`${table.category} in ('security', 'transactional', 'alert', 'lifecycle', 'optional')`,
    ),
    check(
      'communication_templates_hash_check',
      sql`${table.contentHash} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      'communication_templates_no_active_content_check',
      sql`${table.htmlTemplate} !~* '<[[:space:]]*(script|iframe|object|embed|form|style|link|meta)'
          and ${table.htmlTemplate} !~* 'on[a-z]+[[:space:]]*='
          and ${table.htmlTemplate} !~* '(javascript|data):'`,
    ),
    check(
      'communication_templates_payload_size_check',
      sql`octet_length(${table.textTemplate}) <= 65536
          and octet_length(${table.htmlTemplate}) <= 131072
          and octet_length(${table.variableNames}::text) <= 8192`,
    ),
  ],
);

export const communicationDeliveryAttempts = pgTable(
  'communication_delivery_attempts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    deliveryId: uuid('delivery_id')
      .notNull()
      .references(() => notificationDeliveries.id, { onDelete: 'restrict' }),
    attempt: integer('attempt').notNull(),
    providerKey: varchar('provider_key', { length: 80 }).notNull(),
    providerMessageIdHash: varchar('provider_message_id_hash', { length: 64 }),
    status: varchar('status', { length: 24 }).notNull(),
    errorCode: varchar('error_code', { length: 80 }),
    retryable: varchar('retryable', { length: 8 }).notNull(),
    responseMetadata: jsonb('response_metadata')
      .$type<Readonly<Record<string, unknown>>>()
      .default({})
      .notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    unique('communication_delivery_attempts_delivery_attempt_unique').on(
      table.deliveryId,
      table.attempt,
    ),
    index('communication_delivery_attempts_status_started_idx').on(
      table.status,
      table.startedAt,
    ),
    index('communication_delivery_attempts_message_hash_idx').on(
      table.providerMessageIdHash,
    ),
    check(
      'communication_delivery_attempts_status_check',
      sql`${table.status} in ('started', 'delivered', 'retry_scheduled', 'failed', 'bounced', 'complained')`,
    ),
    check(
      'communication_delivery_attempts_retryable_check',
      sql`${table.retryable} in ('true', 'false')`,
    ),
    check(
      'communication_delivery_attempts_attempt_check',
      sql`${table.attempt} > 0`,
    ),
    check(
      'communication_delivery_attempts_message_hash_check',
      sql`${table.providerMessageIdHash} is null or ${table.providerMessageIdHash} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      'communication_delivery_attempts_metadata_size_check',
      sql`octet_length(${table.responseMetadata}::text) <= 8192`,
    ),
  ],
);

export const communicationProviderEvents = pgTable(
  'communication_provider_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerKey: varchar('provider_key', { length: 80 }).notNull(),
    providerEventIdHash: varchar('provider_event_id_hash', {
      length: 64,
    }).notNull(),
    providerMessageIdHash: varchar('provider_message_id_hash', {
      length: 64,
    }).notNull(),
    eventType: varchar('event_type', { length: 24 }).notNull(),
    signatureVersion: varchar('signature_version', { length: 24 }).notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('communication_provider_events_provider_event_unique').on(
      table.providerKey,
      table.providerEventIdHash,
    ),
    index('communication_provider_events_message_idx').on(
      table.providerMessageIdHash,
      table.occurredAt,
    ),
    check(
      'communication_provider_events_type_check',
      sql`${table.eventType} in ('bounce', 'complaint')`,
    ),
    check(
      'communication_provider_events_hash_check',
      sql`${table.providerEventIdHash} ~ '^[a-f0-9]{64}$'
          and ${table.providerMessageIdHash} ~ '^[a-f0-9]{64}$'`,
    ),
  ],
);

export const communicationsSchema = {
  communicationDeliveryAttempts,
  communicationProviderEvents,
  communicationTemplates,
};
