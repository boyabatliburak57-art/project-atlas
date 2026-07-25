import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import type { OnboardingState } from '@atlas/domain';

import { securityUsers } from './security';

export const userPreferences = pgTable(
  'user_preferences',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => securityUsers.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).default('tr-TR').notNull(),
    timezone: varchar('timezone', { length: 64 })
      .default('Europe/Istanbul')
      .notNull(),
    dateFormat: varchar('date_format', { length: 24 })
      .default('dd.MM.yyyy')
      .notNull(),
    numberFormat: varchar('number_format', { length: 16 })
      .default('tr-TR')
      .notNull(),
    currency: varchar('currency', { length: 3 }).default('TRY').notNull(),
    defaultMarket: varchar('default_market', { length: 24 })
      .default('BIST')
      .notNull(),
    defaultBenchmark: varchar('default_benchmark', { length: 32 })
      .default('XU100')
      .notNull(),
    defaultChartAdjustment: varchar('default_chart_adjustment', { length: 24 })
      .default('adjusted')
      .notNull(),
    defaultTimeframe: varchar('default_timeframe', { length: 16 })
      .default('1d')
      .notNull(),
    notificationChannels: jsonb('notification_channels')
      .$type<readonly string[]>()
      .default(['in_app', 'email'])
      .notNull(),
    quietHours: jsonb('quiet_hours')
      .$type<{
        enabled: boolean;
        startMinute: number | null;
        endMinute: number | null;
      }>()
      .default({ enabled: false, startMinute: null, endMinute: null })
      .notNull(),
    accessibility: jsonb('accessibility')
      .$type<{ reducedMotion: boolean }>()
      .default({ reducedMotion: false })
      .notNull(),
    display: jsonb('display')
      .$type<{ compactTable: boolean; methodologyDetailLevel: string }>()
      .default({ compactTable: false, methodologyDetailLevel: 'standard' })
      .notNull(),
    onboardingState: jsonb('onboarding_state')
      .$type<OnboardingState>()
      .default({
        status: 'not_started',
        currentStep: 'disclosure',
        completedSteps: [],
        demoDataRequested: false,
        completedAt: null,
      })
      .notNull(),
    version: integer('version').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check('user_preferences_version_check', sql`${table.version} > 0`),
    check(
      'user_preferences_json_size_check',
      sql`octet_length(${table.quietHours}::text) <= 1024 and octet_length(${table.accessibility}::text) <= 1024 and octet_length(${table.display}::text) <= 2048 and octet_length(${table.onboardingState}::text) <= 8192`,
    ),
    check(
      'user_preferences_currency_check',
      sql`${table.currency} ~ '^[A-Z]{3}$'`,
    ),
  ],
);
