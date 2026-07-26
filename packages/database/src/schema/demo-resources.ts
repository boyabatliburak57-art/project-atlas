import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { securityUsers } from './security';

export const userDemoResources = pgTable(
  'user_demo_resources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => securityUsers.id, { onDelete: 'cascade' }),
    resourceType: varchar('resource_type', { length: 32 }).notNull(),
    stableKey: varchar('stable_key', { length: 120 }).notNull(),
    label: varchar('label', { length: 240 }).notNull(),
    isDemo: boolean('is_demo').default(true).notNull(),
    payload: jsonb('payload')
      .$type<Readonly<Record<string, unknown>>>()
      .default({})
      .notNull(),
    disclaimer: text('disclaimer').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('user_demo_resources_owner_key_unique').on(
      table.ownerUserId,
      table.stableKey,
    ),
    index('user_demo_resources_owner_type_idx').on(
      table.ownerUserId,
      table.resourceType,
    ),
    check('user_demo_resources_demo_check', sql`${table.isDemo} = true`),
    check(
      'user_demo_resources_type_check',
      sql`${table.resourceType} in ('watchlist', 'savedScan', 'portfolio', 'alert', 'strategy', 'backtestResult')`,
    ),
    check(
      'user_demo_resources_payload_check',
      sql`octet_length(${table.payload}::text) <= 32768
        and octet_length(${table.disclaimer}) between 1 and 2048`,
    ),
  ],
);
