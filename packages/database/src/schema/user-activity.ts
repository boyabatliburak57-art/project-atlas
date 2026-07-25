import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { securityUsers } from './security';

export const userActivityEvents = pgTable(
  'user_activity_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => securityUsers.id, { onDelete: 'cascade' }),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    sourceType: varchar('source_type', { length: 48 }).notNull(),
    sourceId: uuid('source_id'),
    status: varchar('status', { length: 32 }).notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    summary: text('summary').notNull(),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    deduplicationKey: varchar('deduplication_key', {
      length: 160,
    }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('user_activity_events_user_dedup_unique').on(
      table.userId,
      table.deduplicationKey,
    ),
    index('user_activity_events_user_cursor_idx').on(
      table.userId,
      table.occurredAt.desc(),
      table.id.desc(),
    ),
    index('user_activity_events_expiry_idx').on(table.expiresAt),
    check(
      'user_activity_events_summary_not_blank',
      sql`length(trim(${table.summary})) > 0`,
    ),
    check(
      'user_activity_events_metadata_size',
      sql`octet_length(${table.metadata}::text) <= 4096`,
    ),
  ],
);
