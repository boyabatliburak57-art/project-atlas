import { readFileSync, readdirSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { migrationFolder } from './migration';

function migrationSql(): string {
  return readdirSync(migrationFolder())
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => readFileSync(`${migrationFolder()}/${file}`, 'utf8'))
    .join('\n');
}

describe('generated PostgreSQL migrations', () => {
  const sql = migrationSql();

  it('creates the thirty scoped tables and current revision view', () => {
    expect(sql.match(/CREATE TABLE/g)).toHaveLength(30);
    expect(sql).toContain('CREATE VIEW "public"."current_price_bars"');
  });

  it('contains required financial and integrity constraints', () => {
    expect(sql).toContain('timestamp with time zone');
    expect(sql).toContain('"open" numeric NOT NULL');
    expect(sql).toContain('FOREIGN KEY');
    expect(sql).toContain('price_bars_natural_revision_unique');
    expect(sql).toContain('price_bars_ohlc_check');
  });

  it('does not introduce TimescaleDB or partitioning', () => {
    expect(sql.toLowerCase()).not.toContain('timescaledb');
    expect(sql.toLowerCase()).not.toContain('partition by');
  });

  it('contains scanner runtime immutability and idempotency guards', () => {
    expect(sql).toContain('prevent_scanner_revision_mutation');
    expect(sql).toContain('scan_runs_identity_immutable');
    expect(sql).toContain('scan_runs_requester_idempotency_unique');
    expect(sql).toContain('scan_results_run_instrument_unique');
    expect(sql).toContain('scan_run_batches_run_batch_unique');
    expect(sql).toContain('preset_scan_revisions_one_published_unique');
  });

  it('contains alert, watchlist and notification integrity guards', () => {
    for (const table of [
      'watchlists',
      'watchlist_items',
      'watchlist_item_tags',
      'alerts',
      'alert_revisions',
      'alert_evaluations',
      'alert_states',
      'alert_triggers',
      'notifications',
      'notification_preferences',
      'notification_deliveries',
      'notification_outbox',
    ]) {
      expect(sql).toContain(`CREATE TABLE "${table}"`);
    }

    expect(sql).toContain('watchlist_items_watchlist_instrument_unique');
    expect(sql).toContain('alert_evaluations_identity_unique');
    expect(sql).toContain('alert_triggers_deduplication_key_unique');
    expect(sql).toContain('notification_deliveries_channel_idempotency_unique');
    expect(sql).toContain('notifications_user_read_occurred_idx');
    expect(sql).toContain('notification_outbox_status_available_idx');
    expect(sql).toContain('prevent_alert_revision_mutation');
  });
});
