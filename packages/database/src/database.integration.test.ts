import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDatabase } from './client';
import { migrationFolder, runMigrations } from './migration';
import { seedDatabase } from './seed';

function requireTestDatabaseUrl(): string {
  const databaseUrl = process.env.TEST_DATABASE_URL;

  if (databaseUrl === undefined) {
    throw new Error(
      'TEST_DATABASE_URL is required for database integration tests',
    );
  }

  const databaseName = new URL(databaseUrl).pathname.slice(1);
  if (!databaseName.endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL database name must end with _test');
  }

  return databaseUrl;
}

const scannerTables = [
  'preset_scan_revisions',
  'preset_scans',
  'saved_scan_revisions',
  'saved_scan_tags',
  'saved_scans',
  'scan_categories',
  'scan_results',
  'scan_run_batches',
  'scan_run_events',
  'scan_runs',
] as const;

const alertsWatchlistsNotificationTables = [
  'alert_evaluations',
  'alert_revisions',
  'alert_states',
  'alert_triggers',
  'alerts',
  'notification_deliveries',
  'notification_outbox',
  'notification_preferences',
  'notifications',
  'watchlist_item_tags',
  'watchlist_items',
  'watchlists',
] as const;

describe('PostgreSQL migrations', () => {
  const { db, pool } = createDatabase(requireTestDatabaseUrl());

  beforeAll(async () => {
    await pool.query('drop schema if exists public cascade');
    await pool.query('drop schema if exists drizzle cascade');
    await pool.query('create schema public');
    await runMigrations(db);
    await runMigrations(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('clean-migrates exactly the thirty domain tables', async () => {
    const result = await pool.query<{ table_name: string }>(`
      select table_name
      from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name
    `);

    expect(result.rows.map((row) => row.table_name)).toEqual([
      'alert_evaluations',
      'alert_revisions',
      'alert_states',
      'alert_triggers',
      'alerts',
      'data_providers',
      'data_quality_issues',
      'ingestion_runs',
      'instrument_symbol_history',
      'instruments',
      'notification_deliveries',
      'notification_outbox',
      'notification_preferences',
      'notifications',
      'preset_scan_revisions',
      'preset_scans',
      'price_bars',
      'provider_instrument_mappings',
      'saved_scan_revisions',
      'saved_scan_tags',
      'saved_scans',
      'scan_categories',
      'scan_results',
      'scan_run_batches',
      'scan_run_events',
      'scan_runs',
      'sectors',
      'watchlist_item_tags',
      'watchlist_items',
      'watchlists',
    ]);
  });

  it('rejects an invalid foreign key', async () => {
    await expect(
      pool.query(
        `insert into provider_instrument_mappings
          (provider_id, instrument_id, provider_symbol)
         values ($1, $2, $3)`,
        [randomUUID(), randomUUID(), 'INVALID'],
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('rejects a duplicate price bar revision', async () => {
    const provider = await pool.query<{ id: string }>(`
      insert into data_providers (code, name, status)
      values ('integration-provider', 'Integration Provider', 'active')
      returning id
    `);
    const instrument = await pool.query<{ id: string }>(`
      insert into instruments
        (symbol, normalized_symbol, name, market_code, currency_code, status)
      values ('TST01', 'TST01', 'Test Instrument', 'BIST', 'TRY', 'active')
      returning id
    `);
    const values = [
      instrument.rows[0]?.id,
      provider.rows[0]?.id,
      '1d',
      '2026-07-11T00:00:00.000Z',
      '2026-07-12T00:00:00.000Z',
      '100.00',
      '105.00',
      '99.00',
      '103.00',
      '1000000',
      1,
    ];
    const insert = `
      insert into price_bars
        (instrument_id, provider_id, timeframe, open_time, close_time,
         open, high, low, close, volume, revision)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    await pool.query(insert, values);
    await expect(pool.query(insert, values)).rejects.toMatchObject({
      code: '23505',
    });
  });

  it('applies the seed idempotently', async () => {
    await seedDatabase(db);
    await seedDatabase(db);

    const result = await db.execute<{ count: string }>(sql`
      select count(*)::text as count
      from data_providers
      where code = 'manual-import'
    `);

    expect(result.rows[0]?.count).toBe('1');

    const categories = await db.execute<{ count: string }>(sql`
      select count(*)::text as count from scan_categories
    `);
    expect(categories.rows[0]?.count).toBe('8');

    const presets = await db.execute<{ count: string }>(sql`
      select count(*)::text as count from preset_scans
    `);
    const revisions = await db.execute<{ count: string }>(sql`
      select count(*)::text as count from preset_scan_revisions
    `);
    expect(presets.rows[0]?.count).toBe('10');
    expect(revisions.rows[0]?.count).toBe('10');

    const published = await db.execute<{ count: string }>(sql`
      select count(*)::text as count
      from preset_scans p
      join preset_scan_revisions r
        on r.preset_scan_id = p.id and r.revision = p.current_revision
      where p.status = 'published' and r.lifecycle_status = 'published'
    `);
    expect(published.rows[0]?.count).toBe('10');
  });

  it('keeps saved and preset revisions immutable and parents soft deletable', async () => {
    const userId = randomUUID();
    const saved = await pool.query<{ id: string }>(
      `insert into saved_scans (owner_user_id, name) values ($1, 'Immutable') returning id`,
      [userId],
    );
    const savedId = saved.rows[0]!.id;
    await pool.query(
      `insert into saved_scan_revisions
        (saved_scan_id, revision, rule_version, rule_ast, complexity_score, created_by)
       values ($1, 1, 1, '{}', 10, $2)`,
      [savedId, userId],
    );
    await expect(
      pool.query(
        `update saved_scan_revisions set complexity_score = 11 where saved_scan_id = $1`,
        [savedId],
      ),
    ).rejects.toMatchObject({ code: '23514' });

    await pool.query(
      `update saved_scans set status = 'deleted', deleted_at = now() where id = $1`,
      [savedId],
    );
    await expect(
      pool.query(`delete from saved_scans where id = $1`, [savedId]),
    ).rejects.toMatchObject({ code: '23503' });

    const category = await pool.query<{ id: string }>(
      `select id from scan_categories order by code limit 1`,
    );
    const preset = await pool.query<{ id: string }>(
      `insert into preset_scans (code, category_id, name)
       values ('immutable-preset', $1, 'Immutable Preset') returning id`,
      [category.rows[0]!.id],
    );
    const presetId = preset.rows[0]!.id;
    await pool.query(
      `insert into preset_scan_revisions
        (preset_scan_id, revision, rule_version, rule_ast, complexity_score,
         lifecycle_status, created_by, published_by, published_at)
       values ($1, 1, 1, '{}', 10, 'published', $2, $2, now())`,
      [presetId, userId],
    );
    await expect(
      pool.query(
        `insert into preset_scan_revisions
          (preset_scan_id, revision, rule_version, rule_ast, complexity_score,
           lifecycle_status, created_by, published_by, published_at)
         values ($1, 2, 1, '{}', 10, 'published', $2, $2, now())`,
        [presetId, userId],
      ),
    ).rejects.toMatchObject({ code: '23505' });
    await expect(
      pool.query(
        `delete from preset_scan_revisions where preset_scan_id = $1`,
        [presetId],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('enforces run, batch, result, tag and immutable snapshot guards', async () => {
    const userId = randomUUID();
    const saved = await pool.query<{ id: string }>(
      `insert into saved_scans (owner_user_id, name) values ($1, 'Guards') returning id`,
      [userId],
    );
    const savedId = saved.rows[0]!.id;
    await pool.query(
      `insert into saved_scan_tags (saved_scan_id, tag) values ($1, 'trend')`,
      [savedId],
    );
    await expect(
      pool.query(
        `insert into saved_scan_tags (saved_scan_id, tag) values ($1, 'trend')`,
        [savedId],
      ),
    ).rejects.toMatchObject({ code: '23505' });

    const run = await pool.query<{ id: string }>(
      `insert into scan_runs
        (source_type, requested_by, idempotency_key_hash, request_hash,
         execution_mode, plan_version, rule_version, normalized_rule_ast,
         execution_plan, universe_snapshot, complexity_score, data_cutoff_at,
         progress_total)
       values ('ad_hoc', $1, 'key-hash', 'request-hash', 'async', 1, 1,
               '{}', '{}', '{}', 10, '2026-07-13T00:00:00Z', 1)
       returning id`,
      [userId],
    );
    const runId = run.rows[0]!.id;
    await expect(
      pool.query(
        `insert into scan_runs
          (source_type, requested_by, idempotency_key_hash, request_hash,
           execution_mode, plan_version, rule_version, normalized_rule_ast,
           execution_plan, universe_snapshot, complexity_score, data_cutoff_at)
         values ('ad_hoc', $1, 'key-hash', 'other-request', 'async', 1, 1,
                 '{}', '{}', '{}', 10, now())`,
        [userId],
      ),
    ).rejects.toMatchObject({ code: '23505' });
    await expect(
      pool.query(
        `update scan_runs set universe_snapshot = '{"changed":true}' where id = $1`,
        [runId],
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      pool.query(`update scan_runs set progress_processed = 2 where id = $1`, [
        runId,
      ]),
    ).rejects.toMatchObject({ code: '23514' });

    await pool.query(
      `insert into scan_run_batches
        (scan_run_id, batch_index, plan_version, instrument_ids)
       values ($1, 0, 1, '[]')`,
      [runId],
    );
    await expect(
      pool.query(
        `insert into scan_run_batches
          (scan_run_id, batch_index, plan_version, instrument_ids)
         values ($1, 0, 1, '[]')`,
        [runId],
      ),
    ).rejects.toMatchObject({ code: '23505' });

    const instrument = await pool.query<{ id: string }>(
      `insert into instruments
        (symbol, normalized_symbol, name, market_code, currency_code, status)
       values ('SCAN1', 'SCAN1', 'Scanner Instrument', 'BIST', 'TRY', 'active')
       returning id`,
    );
    const resultValues = [runId, instrument.rows[0]!.id];
    const resultInsert = `insert into scan_results
      (scan_run_id, instrument_id, status, data_cutoff_at, source_batch_index)
      values ($1, $2, 'matched', '2026-07-13T00:00:00Z', 0)`;
    await pool.query(resultInsert, resultValues);
    await expect(pool.query(resultInsert, resultValues)).rejects.toMatchObject({
      code: '23505',
    });
  });

  it('enforces watchlist ownership indexes, foreign keys and uniqueness', async () => {
    const ownerUserId = randomUUID();
    const watchlist = await pool.query<{ id: string }>(
      `insert into watchlists (owner_user_id, name)
       values ($1, 'BIST Leaders') returning id`,
      [ownerUserId],
    );
    const instrument = await pool.query<{ id: string }>(`
      insert into instruments
        (symbol, normalized_symbol, name, market_code, currency_code, status)
      values ('WLIST1', 'WLIST1', 'Watchlist Instrument', 'BIST', 'TRY', 'active')
      returning id
    `);
    const values = [watchlist.rows[0]!.id, instrument.rows[0]!.id];
    const item = await pool.query<{ id: string }>(
      `insert into watchlist_items (watchlist_id, instrument_id, sort_order)
       values ($1, $2, 0) returning id`,
      values,
    );

    await expect(
      pool.query(
        `insert into watchlist_items (watchlist_id, instrument_id)
         values ($1, $2)`,
        values,
      ),
    ).rejects.toMatchObject({ code: '23505' });
    await expect(
      pool.query(
        `insert into watchlist_items (watchlist_id, instrument_id)
         values ($1, $2)`,
        [randomUUID(), instrument.rows[0]!.id],
      ),
    ).rejects.toMatchObject({ code: '23503' });

    await pool.query(
      `insert into watchlist_item_tags (watchlist_item_id, tag)
       values ($1, 'momentum')`,
      [item.rows[0]!.id],
    );
    await expect(
      pool.query(
        `insert into watchlist_item_tags (watchlist_item_id, tag)
         values ($1, 'momentum')`,
        [item.rows[0]!.id],
      ),
    ).rejects.toMatchObject({ code: '23505' });

    const indexes = await pool.query<{ indexname: string }>(`
      select indexname from pg_indexes
      where schemaname = 'public'
        and indexname in (
          'watchlists_owner_status_updated_idx',
          'watchlist_items_watchlist_instrument_unique'
        )
      order by indexname
    `);
    expect(indexes.rows.map(({ indexname }) => indexname)).toEqual([
      'watchlist_items_watchlist_instrument_unique',
      'watchlists_owner_status_updated_idx',
    ]);
  });

  it('keeps alert revisions immutable and deduplicates evaluations and triggers', async () => {
    const ownerUserId = randomUUID();
    const savedScan = await pool.query<{ id: string }>(
      `insert into saved_scans (owner_user_id, name)
       values ($1, 'Alert Source') returning id`,
      [ownerUserId],
    );
    const savedScanId = savedScan.rows[0]!.id;
    await pool.query(
      `insert into saved_scan_revisions
        (saved_scan_id, revision, rule_version, rule_ast, created_by)
       values ($1, 1, 1, '{}', $2)`,
      [savedScanId, ownerUserId],
    );
    const alert = await pool.query<{ id: string }>(
      `insert into alerts (owner_user_id, name, current_revision)
       values ($1, 'New Match', 1) returning id`,
      [ownerUserId],
    );
    const alertId = alert.rows[0]!.id;
    const revisionInsert = `insert into alert_revisions
      (alert_id, revision, source_type, saved_scan_id, saved_scan_revision,
       trigger_policy, repeat_policy, channels, created_by)
      values ($1, 1, 'saved_scan', $2, 1, 'newMatch', 'everyNewMatch',
              '["in_app"]', $3)`;
    await pool.query(revisionInsert, [alertId, savedScanId, ownerUserId]);

    await expect(
      pool.query(
        `update alert_revisions set repeat_policy = 'once'
         where alert_id = $1 and revision = 1`,
        [alertId],
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      pool.query(
        `delete from alert_revisions
         where alert_id = $1 and revision = 1`,
        [alertId],
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      pool.query(
        `insert into alert_revisions
          (alert_id, revision, source_type, saved_scan_id, saved_scan_revision,
           trigger_policy, repeat_policy, created_by)
         values ($1, 2, 'saved_scan', $2, 1, 'newMatch', 'everyNewMatch', $3)`,
        [alertId, randomUUID(), ownerUserId],
      ),
    ).rejects.toMatchObject({ code: '23503' });

    const evaluationInsert = `insert into alert_evaluations
      (alert_id, alert_revision, source_event_id, data_cutoff_at, status)
      values ($1, 1, 'scan-run:1', '2026-07-15T16:00:00Z', 'matched')
      returning id`;
    const evaluation = await pool.query<{ id: number }>(evaluationInsert, [
      alertId,
    ]);
    await expect(pool.query(evaluationInsert, [alertId])).rejects.toMatchObject(
      { code: '23505' },
    );

    const triggerInsert = `insert into alert_triggers
      (alert_id, alert_revision, evaluation_id, trigger_type, deduplication_key)
      values ($1, 1, $2, 'newMatch', 'alert:1:revision:1:event:1')`;
    await pool.query(triggerInsert, [alertId, evaluation.rows[0]!.id]);
    await expect(
      pool.query(triggerInsert, [alertId, evaluation.rows[0]!.id]),
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('enforces notification delivery and outbox idempotency with required indexes', async () => {
    const userId = randomUUID();
    const notification = await pool.query<{ id: string }>(
      `insert into notifications
        (user_id, type, title, body, occurred_at)
       values ($1, 'systemAnnouncement', 'Maintenance', 'Planned', now())
       returning id`,
      [userId],
    );
    const notificationId = notification.rows[0]!.id;
    const deliveryInsert = `insert into notification_deliveries
      (notification_id, user_id, channel, idempotency_key, template_code,
       template_version, locale)
      values ($1, $2, 'email', 'notification:maintenance:email',
              'system-announcement', 1, 'tr-TR')
      returning id`;
    const delivery = await pool.query<{ id: string }>(deliveryInsert, [
      notificationId,
      userId,
    ]);
    await expect(
      pool.query(deliveryInsert, [notificationId, userId]),
    ).rejects.toMatchObject({ code: '23505' });

    const outboxInsert = `insert into notification_outbox (delivery_id)
      values ($1)`;
    await pool.query(outboxInsert, [delivery.rows[0]!.id]);
    await expect(
      pool.query(outboxInsert, [delivery.rows[0]!.id]),
    ).rejects.toMatchObject({ code: '23505' });
    await expect(
      pool.query(
        `insert into notification_deliveries
          (notification_id, user_id, channel, idempotency_key, template_code,
           template_version, locale)
         values ($1, $2, 'email', 'notification:missing:email',
                 'system-announcement', 1, 'tr-TR')`,
        [notificationId, randomUUID()],
      ),
    ).rejects.toMatchObject({ code: '23503' });

    const indexes = await pool.query<{ indexname: string }>(`
      select indexname from pg_indexes
      where schemaname = 'public'
        and indexname in (
          'alerts_owner_status_updated_idx',
          'notifications_user_read_occurred_idx',
          'notification_deliveries_channel_idempotency_unique',
          'notification_outbox_status_available_idx'
        )
      order by indexname
    `);
    expect(indexes.rows.map(({ indexname }) => indexname)).toEqual([
      'alerts_owner_status_updated_idx',
      'notification_deliveries_channel_idempotency_unique',
      'notification_outbox_status_available_idx',
      'notifications_user_read_occurred_idx',
    ]);
  });

  it('executes the documented destructive rollback and reapplies forward', async () => {
    const alertsRollbackSql = await readFile(
      resolve(
        migrationFolder(),
        'rollback/0003_alerts_watchlists_notifications.down.sql',
      ),
      'utf8',
    );
    await pool.query(alertsRollbackSql);

    const alertsRolledBack = await pool.query<{ table_name: string }>(
      `
      select table_name from information_schema.tables
      where table_schema = 'public' and table_name = any($1::text[])
    `,
      [alertsWatchlistsNotificationTables],
    );
    expect(alertsRolledBack.rows).toEqual([]);

    const rollbackSql = await readFile(
      resolve(migrationFolder(), 'rollback/0002_scanner_runtime.down.sql'),
      'utf8',
    );
    await pool.query(rollbackSql);

    const rolledBack = await pool.query<{ table_name: string }>(
      `
      select table_name from information_schema.tables
      where table_schema = 'public' and table_name = any($1::text[])
    `,
      [scannerTables],
    );
    expect(rolledBack.rows).toEqual([]);

    await pool.query(`
      delete from drizzle.__drizzle_migrations
      where created_at in (
        select created_at from drizzle.__drizzle_migrations
        order by created_at desc
        limit 2
      )
    `);
    await runMigrations(db);

    const reapplied = await pool.query<{ table_name: string }>(
      `
      select table_name from information_schema.tables
      where table_schema = 'public' and table_name = any($1::text[])
      order by table_name
    `,
      [scannerTables],
    );
    expect(reapplied.rows.map(({ table_name }) => table_name)).toEqual(
      [...scannerTables].sort(),
    );

    const alertsReapplied = await pool.query<{ table_name: string }>(
      `
      select table_name from information_schema.tables
      where table_schema = 'public' and table_name = any($1::text[])
      order by table_name
    `,
      [alertsWatchlistsNotificationTables],
    );
    expect(alertsReapplied.rows.map(({ table_name }) => table_name)).toEqual(
      [...alertsWatchlistsNotificationTables].sort(),
    );
  });
});
