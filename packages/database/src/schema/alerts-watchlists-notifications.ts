import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { instruments } from './instrument-master';
import { presetScanRevisions, savedScanRevisions } from './scanner-runtime';

const auditTimestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
};

const emptyObject = sql`'{}'::jsonb`;
const emptyArray = sql`'[]'::jsonb`;

export const watchlists = pgTable(
  'watchlists',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerUserId: uuid('owner_user_id').notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    description: text('description'),
    visibility: varchar('visibility', { length: 24 })
      .default('private')
      .notNull(),
    status: varchar('status', { length: 24 }).default('active').notNull(),
    ...auditTimestamps,
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('watchlists_owner_status_updated_idx').on(
      table.ownerUserId,
      table.status,
      table.updatedAt.desc(),
    ),
    check('watchlists_name_not_blank', sql`length(trim(${table.name})) > 0`),
    check('watchlists_visibility_check', sql`${table.visibility} = 'private'`),
    check(
      'watchlists_status_check',
      sql`${table.status} in ('active', 'deleted')`,
    ),
    check(
      'watchlists_deleted_state_check',
      sql`(${table.status} = 'deleted') = (${table.deletedAt} is not null)`,
    ),
  ],
);

export const watchlistItems = pgTable(
  'watchlist_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    watchlistId: uuid('watchlist_id')
      .notNull()
      .references(() => watchlists.id, { onDelete: 'cascade' }),
    instrumentId: uuid('instrument_id')
      .notNull()
      .references(() => instruments.id, { onDelete: 'restrict' }),
    note: text('note'),
    sortOrder: integer('sort_order').default(0).notNull(),
    ...auditTimestamps,
  },
  (table) => [
    uniqueIndex('watchlist_items_watchlist_instrument_unique').on(
      table.watchlistId,
      table.instrumentId,
    ),
    index('watchlist_items_watchlist_sort_idx').on(
      table.watchlistId,
      table.sortOrder,
      table.id,
    ),
    index('watchlist_items_instrument_idx').on(table.instrumentId),
    check('watchlist_items_sort_order_check', sql`${table.sortOrder} >= 0`),
  ],
);

export const watchlistItemTags = pgTable(
  'watchlist_item_tags',
  {
    watchlistItemId: uuid('watchlist_item_id')
      .notNull()
      .references(() => watchlistItems.id, { onDelete: 'cascade' }),
    tag: varchar('tag', { length: 64 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.watchlistItemId, table.tag],
      name: 'watchlist_item_tags_pk',
    }),
    check(
      'watchlist_item_tags_tag_not_blank',
      sql`length(trim(${table.tag})) > 0`,
    ),
  ],
);

export const alerts = pgTable(
  'alerts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerUserId: uuid('owner_user_id').notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    status: varchar('status', { length: 24 }).default('active').notNull(),
    currentRevision: integer('current_revision').default(0).notNull(),
    ...auditTimestamps,
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('alerts_owner_status_updated_idx').on(
      table.ownerUserId,
      table.status,
      table.updatedAt.desc(),
    ),
    check('alerts_name_not_blank', sql`length(trim(${table.name})) > 0`),
    check(
      'alerts_status_check',
      sql`${table.status} in ('active', 'paused', 'invalid', 'deleted')`,
    ),
    check('alerts_current_revision_check', sql`${table.currentRevision} >= 0`),
    check(
      'alerts_deleted_state_check',
      sql`(${table.status} = 'deleted') = (${table.deletedAt} is not null)`,
    ),
  ],
);

export const alertRevisions = pgTable(
  'alert_revisions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    alertId: uuid('alert_id')
      .notNull()
      .references(() => alerts.id, { onDelete: 'restrict' }),
    revision: integer('revision').notNull(),
    sourceType: varchar('source_type', { length: 40 }).notNull(),
    savedScanId: uuid('saved_scan_id'),
    savedScanRevision: integer('saved_scan_revision'),
    presetScanId: uuid('preset_scan_id'),
    presetScanRevision: integer('preset_scan_revision'),
    instrumentId: uuid('instrument_id').references(() => instruments.id, {
      onDelete: 'restrict',
    }),
    watchlistId: uuid('watchlist_id').references(() => watchlists.id, {
      onDelete: 'restrict',
    }),
    triggerPolicy: varchar('trigger_policy', { length: 32 }).notNull(),
    repeatPolicy: varchar('repeat_policy', { length: 32 }).notNull(),
    timeframe: varchar('timeframe', { length: 16 }),
    evaluationMode: varchar('evaluation_mode', { length: 24 })
      .default('closed_bar')
      .notNull(),
    sourceConfiguration: jsonb('source_configuration')
      .$type<Record<string, unknown>>()
      .default(emptyObject)
      .notNull(),
    channels: jsonb('channels')
      .$type<readonly string[]>()
      .default(emptyArray)
      .notNull(),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('alert_revisions_alert_revision_unique').on(
      table.alertId,
      table.revision,
    ),
    index('alert_revisions_saved_scan_idx').on(
      table.savedScanId,
      table.savedScanRevision,
    ),
    index('alert_revisions_preset_scan_idx').on(
      table.presetScanId,
      table.presetScanRevision,
    ),
    index('alert_revisions_instrument_timeframe_idx').on(
      table.instrumentId,
      table.timeframe,
    ),
    index('alert_revisions_watchlist_idx').on(table.watchlistId),
    foreignKey({
      columns: [table.savedScanId, table.savedScanRevision],
      foreignColumns: [
        savedScanRevisions.savedScanId,
        savedScanRevisions.revision,
      ],
      name: 'alert_revisions_saved_scan_revision_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.presetScanId, table.presetScanRevision],
      foreignColumns: [
        presetScanRevisions.presetScanId,
        presetScanRevisions.revision,
      ],
      name: 'alert_revisions_preset_scan_revision_fk',
    }).onDelete('restrict'),
    check('alert_revisions_revision_check', sql`${table.revision} >= 1`),
    check(
      'alert_revisions_source_type_check',
      sql`${table.sourceType} in ('saved_scan', 'preset_scan', 'instrument_price', 'instrument_percent_change', 'instrument_indicator', 'watchlist_saved_scan')`,
    ),
    check(
      'alert_revisions_trigger_policy_check',
      sql`${table.triggerPolicy} in ('anyMatch', 'newMatch', 'symbolEntered', 'symbolExited', 'thresholdCrossed')`,
    ),
    check(
      'alert_revisions_repeat_policy_check',
      sql`${table.repeatPolicy} in ('once', 'oncePerClosedBar', 'oncePerDay', 'afterReset', 'everyNewMatch')`,
    ),
    check(
      'alert_revisions_evaluation_mode_check',
      sql`${table.evaluationMode} in ('closed_bar', 'intrabar')`,
    ),
    check(
      'alert_revisions_source_reference_check',
      sql`
        (${table.sourceType} = 'saved_scan' and ${table.savedScanId} is not null and ${table.savedScanRevision} is not null and ${table.presetScanId} is null and ${table.instrumentId} is null and ${table.watchlistId} is null)
        or (${table.sourceType} = 'preset_scan' and ${table.presetScanId} is not null and ${table.presetScanRevision} is not null and ${table.savedScanId} is null and ${table.instrumentId} is null and ${table.watchlistId} is null)
        or (${table.sourceType} in ('instrument_price', 'instrument_percent_change', 'instrument_indicator') and ${table.instrumentId} is not null and ${table.savedScanId} is null and ${table.presetScanId} is null and ${table.watchlistId} is null)
        or (${table.sourceType} = 'watchlist_saved_scan' and ${table.watchlistId} is not null and ${table.savedScanId} is not null and ${table.savedScanRevision} is not null and ${table.presetScanId} is null and ${table.instrumentId} is null)
      `,
    ),
    check(
      'alert_revisions_source_revision_check',
      sql`(${table.savedScanRevision} is null or ${table.savedScanRevision} >= 1) and (${table.presetScanRevision} is null or ${table.presetScanRevision} >= 1)`,
    ),
  ],
);

export const alertEvaluations = pgTable(
  'alert_evaluations',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    alertId: uuid('alert_id').notNull(),
    alertRevision: integer('alert_revision').notNull(),
    sourceEventId: varchar('source_event_id', { length: 160 }).notNull(),
    dataCutoffAt: timestamp('data_cutoff_at', { withTimezone: true }).notNull(),
    instrumentId: uuid('instrument_id').references(() => instruments.id, {
      onDelete: 'restrict',
    }),
    timeframe: varchar('timeframe', { length: 16 }),
    evaluationWindow: varchar('evaluation_window', { length: 160 }),
    status: varchar('status', { length: 24 }).notNull(),
    reasonCode: varchar('reason_code', { length: 64 }),
    result: jsonb('result')
      .$type<Record<string, unknown>>()
      .default(emptyObject)
      .notNull(),
    durationMs: integer('duration_ms'),
    evaluatedAt: timestamp('evaluated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('alert_evaluations_id_alert_revision_unique').on(
      table.id,
      table.alertId,
      table.alertRevision,
    ),
    uniqueIndex('alert_evaluations_identity_unique').on(
      table.alertId,
      table.alertRevision,
      table.sourceEventId,
      table.dataCutoffAt,
    ),
    index('alert_evaluations_alert_evaluated_idx').on(
      table.alertId,
      table.evaluatedAt.desc(),
    ),
    index('alert_evaluations_instrument_cutoff_idx').on(
      table.instrumentId,
      table.dataCutoffAt.desc(),
    ),
    foreignKey({
      columns: [table.alertId, table.alertRevision],
      foreignColumns: [alertRevisions.alertId, alertRevisions.revision],
      name: 'alert_evaluations_alert_revision_fk',
    }).onDelete('restrict'),
    check(
      'alert_evaluations_status_check',
      sql`${table.status} in ('matched', 'not_matched', 'not_evaluable', 'failed')`,
    ),
    check(
      'alert_evaluations_duration_check',
      sql`${table.durationMs} is null or ${table.durationMs} >= 0`,
    ),
  ],
);

export const alertStates = pgTable(
  'alert_states',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    alertId: uuid('alert_id').notNull(),
    alertRevision: integer('alert_revision').notNull(),
    stateKey: varchar('state_key', { length: 200 }).notNull(),
    matchState: varchar('match_state', { length: 24 })
      .default('unknown')
      .notNull(),
    armed: boolean('armed').default(true).notNull(),
    stateData: jsonb('state_data')
      .$type<Record<string, unknown>>()
      .default(emptyObject)
      .notNull(),
    lastSourceEventId: varchar('last_source_event_id', { length: 160 }),
    lastDataCutoffAt: timestamp('last_data_cutoff_at', { withTimezone: true }),
    lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
    ...auditTimestamps,
  },
  (table) => [
    uniqueIndex('alert_states_alert_revision_key_unique').on(
      table.alertId,
      table.alertRevision,
      table.stateKey,
    ),
    index('alert_states_alert_updated_idx').on(
      table.alertId,
      table.updatedAt.desc(),
    ),
    foreignKey({
      columns: [table.alertId, table.alertRevision],
      foreignColumns: [alertRevisions.alertId, alertRevisions.revision],
      name: 'alert_states_alert_revision_fk',
    }).onDelete('cascade'),
    check(
      'alert_states_match_state_check',
      sql`${table.matchState} in ('unknown', 'matched', 'not_matched', 'not_evaluable')`,
    ),
    check(
      'alert_states_state_key_not_blank',
      sql`length(trim(${table.stateKey})) > 0`,
    ),
  ],
);

export const alertTriggers = pgTable(
  'alert_triggers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    alertId: uuid('alert_id').notNull(),
    alertRevision: integer('alert_revision').notNull(),
    evaluationId: bigint('evaluation_id', { mode: 'number' }).notNull(),
    instrumentId: uuid('instrument_id').references(() => instruments.id, {
      onDelete: 'restrict',
    }),
    triggerType: varchar('trigger_type', { length: 32 }).notNull(),
    deduplicationKey: varchar('deduplication_key', { length: 255 }).notNull(),
    payload: jsonb('payload')
      .$type<Record<string, unknown>>()
      .default(emptyObject)
      .notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('alert_triggers_deduplication_key_unique').on(
      table.deduplicationKey,
    ),
    index('alert_triggers_alert_occurred_idx').on(
      table.alertId,
      table.occurredAt.desc(),
    ),
    index('alert_triggers_instrument_occurred_idx').on(
      table.instrumentId,
      table.occurredAt.desc(),
    ),
    foreignKey({
      columns: [table.evaluationId, table.alertId, table.alertRevision],
      foreignColumns: [
        alertEvaluations.id,
        alertEvaluations.alertId,
        alertEvaluations.alertRevision,
      ],
      name: 'alert_triggers_evaluation_identity_fk',
    }).onDelete('restrict'),
    check(
      'alert_triggers_trigger_type_check',
      sql`${table.triggerType} in ('anyMatch', 'newMatch', 'symbolEntered', 'symbolExited', 'thresholdCrossed')`,
    ),
    check(
      'alert_triggers_deduplication_key_not_blank',
      sql`length(trim(${table.deduplicationKey})) > 0`,
    ),
  ],
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    alertTriggerId: uuid('alert_trigger_id').references(
      () => alertTriggers.id,
      { onDelete: 'restrict' },
    ),
    type: varchar('type', { length: 40 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .default(emptyObject)
      .notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('notifications_id_user_unique').on(table.id, table.userId),
    index('notifications_user_read_occurred_idx').on(
      table.userId,
      table.readAt,
      table.occurredAt.desc(),
    ),
    index('notifications_user_type_occurred_idx').on(
      table.userId,
      table.type,
      table.occurredAt.desc(),
    ),
    index('notifications_expiry_idx').on(table.expiresAt),
    check(
      'notifications_type_check',
      sql`${table.type} in ('alertTriggered', 'alertDeliveryFailed', 'dataStaleWarning', 'scanCompleted', 'systemAnnouncement', 'security')`,
    ),
    check(
      'notifications_expiry_check',
      sql`${table.expiresAt} is null or ${table.expiresAt} >= ${table.occurredAt}`,
    ),
  ],
);

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    userId: uuid('user_id').primaryKey(),
    timezone: varchar('timezone', { length: 64 }).default('UTC').notNull(),
    locale: varchar('locale', { length: 16 }).default('tr-TR').notNull(),
    emailAlertsEnabled: boolean('email_alerts_enabled').default(true).notNull(),
    dailyDigestEnabled: boolean('daily_digest_enabled')
      .default(false)
      .notNull(),
    scanCompletionEnabled: boolean('scan_completion_enabled')
      .default(true)
      .notNull(),
    quietHoursEnabled: boolean('quiet_hours_enabled').default(false).notNull(),
    quietHoursStartMinute: integer('quiet_hours_start_minute'),
    quietHoursEndMinute: integer('quiet_hours_end_minute'),
    throttleMinutes: integer('throttle_minutes').default(0).notNull(),
    ...auditTimestamps,
  },
  (table) => [
    check(
      'notification_preferences_timezone_not_blank',
      sql`length(trim(${table.timezone})) > 0`,
    ),
    check(
      'notification_preferences_quiet_hours_check',
      sql`
        (${table.quietHoursEnabled} and ${table.quietHoursStartMinute} between 0 and 1439 and ${table.quietHoursEndMinute} between 0 and 1439)
        or (not ${table.quietHoursEnabled} and ${table.quietHoursStartMinute} is null and ${table.quietHoursEndMinute} is null)
      `,
    ),
    check(
      'notification_preferences_throttle_check',
      sql`${table.throttleMinutes} >= 0`,
    ),
  ],
);

export const notificationDeliveries = pgTable(
  'notification_deliveries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    notificationId: uuid('notification_id').notNull(),
    userId: uuid('user_id').notNull(),
    channel: varchar('channel', { length: 24 }).notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull(),
    status: varchar('status', { length: 24 }).default('pending').notNull(),
    templateCode: varchar('template_code', { length: 80 }).notNull(),
    templateVersion: integer('template_version').notNull(),
    locale: varchar('locale', { length: 16 }).notNull(),
    attemptCount: integer('attempt_count').default(0).notNull(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    errorCode: varchar('error_code', { length: 64 }),
    ...auditTimestamps,
  },
  (table) => [
    uniqueIndex('notification_deliveries_channel_idempotency_unique').on(
      table.channel,
      table.idempotencyKey,
    ),
    index('notification_deliveries_user_status_created_idx').on(
      table.userId,
      table.status,
      table.createdAt.desc(),
    ),
    index('notification_deliveries_notification_idx').on(table.notificationId),
    foreignKey({
      columns: [table.notificationId, table.userId],
      foreignColumns: [notifications.id, notifications.userId],
      name: 'notification_deliveries_notification_owner_fk',
    }).onDelete('restrict'),
    check(
      'notification_deliveries_channel_check',
      sql`${table.channel} in ('email')`,
    ),
    check(
      'notification_deliveries_status_check',
      sql`${table.status} in ('pending', 'processing', 'delivered', 'failed', 'suppressed', 'cancelled')`,
    ),
    check(
      'notification_deliveries_counters_check',
      sql`${table.templateVersion} >= 1 and ${table.attemptCount} >= 0`,
    ),
    check(
      'notification_deliveries_terminal_timestamp_check',
      sql`(${table.status} = 'delivered') = (${table.deliveredAt} is not null) and (${table.status} = 'failed') = (${table.failedAt} is not null)`,
    ),
  ],
);

export const notificationOutbox = pgTable(
  'notification_outbox',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    deliveryId: uuid('delivery_id')
      .notNull()
      .references(() => notificationDeliveries.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 24 }).default('pending').notNull(),
    availableAt: timestamp('available_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    attemptCount: integer('attempt_count').default(0).notNull(),
    maxAttempts: integer('max_attempts').default(5).notNull(),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    lockedBy: varchar('locked_by', { length: 128 }),
    payload: jsonb('payload')
      .$type<Record<string, unknown>>()
      .default(emptyObject)
      .notNull(),
    lastErrorCode: varchar('last_error_code', { length: 64 }),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    ...auditTimestamps,
  },
  (table) => [
    uniqueIndex('notification_outbox_delivery_unique').on(table.deliveryId),
    index('notification_outbox_status_available_idx').on(
      table.status,
      table.availableAt,
    ),
    check(
      'notification_outbox_status_check',
      sql`${table.status} in ('pending', 'processing', 'completed', 'failed', 'cancelled')`,
    ),
    check(
      'notification_outbox_attempts_check',
      sql`${table.attemptCount} >= 0 and ${table.maxAttempts} >= 1 and ${table.attemptCount} <= ${table.maxAttempts}`,
    ),
    check(
      'notification_outbox_lock_check',
      sql`(${table.lockedAt} is null) = (${table.lockedBy} is null)`,
    ),
  ],
);
