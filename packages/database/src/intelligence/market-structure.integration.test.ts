import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabase } from '../client';
import { runMigrations } from '../migration';

function testUrl() {
  const value = process.env.TEST_DATABASE_URL;
  if (!value || !new URL(value).pathname.slice(1).endsWith('_test'))
    throw new Error('TEST_DATABASE_URL with an _test database is required');
  return value;
}

describe('TASK-110F1 market structure PostgreSQL foundation', () => {
  const { db, pool } = createDatabase(testUrl());
  let providerId = '';
  let instrumentId = '';
  beforeAll(async () => {
    await pool.query('drop schema if exists public cascade');
    await pool.query('drop schema if exists drizzle cascade');
    await pool.query('create schema public');
    await runMigrations(db);
    providerId = (
      await pool.query<{ id: string }>(
        `insert into data_providers(code,name,status) values('market-structure-fixture','Market Structure Fixture','active') returning id`,
      )
    ).rows[0]!.id;
    instrumentId = (
      await pool.query<{ id: string }>(
        `insert into instruments(symbol,normalized_symbol,name,market_code,currency_code,status) values('ASELS','ASELS','Aselsan','BIST','TRY','active') returning id`,
      )
    ).rows[0]!.id;
  });
  afterAll(() => pool.end());
  const insertMeasure = (
    revision: string,
    effectiveFrom = '2026-08-15T09:30:00Z',
    effectiveUntil: string | null = '2026-08-20T15:00:00Z',
    supersedes: string | null = null,
  ) =>
    pool.query<{ revision_id: string }>(
      `
    insert into intelligence_market_measures(measure_id,instrument_id,type,effective_from,effective_until,published_at,status,source_reference,structured_attributes,provider_id,provider_dataset,provider_revision,source_timestamp,available_at,delivery_mode,license_class,quality_state,supersedes_revision_id)
    values('measure-1',$1,'GROSS_SETTLEMENT',$2,$3,'2026-08-15T09:00:00Z','ACTIVE','https://provider.test/m1','{"sourceTaxonomy":"GROSS"}',$4,'measures',$5,'2026-08-15T09:00:30Z','2026-08-15T09:01:00Z','DELAYED','DELAYED_DISPLAY_ONLY','DELAYED',$6) returning revision_id`,
      [
        instrumentId,
        effectiveFrom,
        effectiveUntil,
        providerId,
        revision,
        supersedes,
      ],
    );
  it('clean migrates one canonical activity table', async () =>
    expect(
      (
        await pool.query(
          `select table_name from information_schema.tables where table_name='short_selling_activity_observations'`,
        )
      ).rowCount,
    ).toBe(1));
  it('persists canonical market measures', async () =>
    expect((await insertMeasure('r1')).rowCount).toBe(1));
  it('deduplicates provider measure revisions', async () =>
    await expect(insertMeasure('r1')).rejects.toMatchObject({ code: '23505' }));
  it('preserves immutable corrected revisions', async () => {
    const first = (
      await pool.query<{ revision_id: string }>(
        `select revision_id from intelligence_market_measures where provider_revision='r1'`,
      )
    ).rows[0]!.revision_id;
    await insertMeasure(
      'r2',
      '2026-08-15T09:30:00Z',
      '2026-08-22T15:00:00Z',
      first,
    );
    expect(
      (
        await pool.query(
          `select 1 from intelligence_market_measures where measure_id='measure-1'`,
        )
      ).rowCount,
    ).toBe(2);
  });
  it('prevents revision overwrite', async () => {
    const id = (
      await pool.query<{ revision_id: string }>(
        `select revision_id from intelligence_market_measures limit 1`,
      )
    ).rows[0]!.revision_id;
    await expect(
      pool.query(
        `update intelligence_market_measures set status='EXPIRED' where revision_id=$1`,
        [id],
      ),
    ).rejects.toMatchObject({ code: 'P0001' });
  });
  it('rejects invalid effective periods', async () =>
    await expect(
      insertMeasure(
        'bad-range',
        '2026-08-20T00:00:00Z',
        '2026-08-10T00:00:00Z',
      ),
    ).rejects.toMatchObject({ code: '23514' }));
  it('resolves latest active revision point-in-time', async () => {
    const rows = await pool.query(
      `select m.provider_revision from intelligence_market_measures m where m.available_at<='2026-08-16' and m.effective_from<='2026-08-16' and (m.effective_until is null or m.effective_until>='2026-08-16') and not exists(select 1 from intelligence_market_measures n where n.supersedes_revision_id=m.revision_id and n.available_at<='2026-08-16')`,
    );
    expect(rows.rows).toEqual([{ provider_revision: 'r2' }]);
  });
  it('persists MarketEvent integration without duplicate event systems', async () => {
    const revision = (
      await pool.query<{ revision_id: string }>(
        `select revision_id from intelligence_market_measures where provider_revision='r2'`,
      )
    ).rows[0]!.revision_id;
    await pool.query(
      `insert into intelligence_market_events(revision_id,event_id,event_type,entity_type,entity_id,published_at,effective_at,source_reference,provider_id,provider_dataset,provider_revision,source_timestamp,available_at,delivery_mode,license_class,quality_state) values($1,gen_random_uuid(),'MARKET_MEASURE','INSTRUMENT',$2,'2026-08-15T09:00:00Z','2026-08-15T09:30:00Z','https://provider.test/m1',$3,'measures','r2','2026-08-15T09:00:30Z','2026-08-15T09:01:00Z','DELAYED','DELAYED_DISPLAY_ONLY','DELAYED')`,
      [revision, instrumentId, providerId],
    );
    expect(
      (
        await pool.query(
          `select 1 from intelligence_market_events where event_type='MARKET_MEASURE'`,
        )
      ).rowCount,
    ).toBe(1);
  });
  it('persists short-selling activity separately and deduplicates it', async () => {
    const sql = `insert into short_selling_activity_observations(activity_id,instrument_id,trade_date,quantity,data_cutoff,provider_id,provider_dataset,provider_revision,source_timestamp,available_at,delivery_mode,license_class,quality_state) values('activity-1',$1,'2026-08-15','100','2026-08-15T15:00:00Z',$2,'short-selling','r1','2026-08-15T15:00:30Z','2026-08-15T15:01:00Z','DELAYED','DELAYED_DISPLAY_ONLY','DELAYED')`;
    await pool.query(sql, [instrumentId, providerId]);
    await expect(
      pool.query(sql, [instrumentId, providerId]),
    ).rejects.toMatchObject({ code: '23505' });
  });
  it('rejects invalid short-selling values', async () =>
    await expect(
      pool.query(
        `insert into short_selling_activity_observations(activity_id,instrument_id,trade_date,quantity,data_cutoff,provider_id,provider_dataset,provider_revision,source_timestamp,available_at,delivery_mode,license_class,quality_state) values('bad',$1,'2026-08-15','-1',now(),$2,'short-selling','bad',now(),now(),'DELAYED','DISPLAY_ALLOWED','COMPLETE')`,
        [instrumentId, providerId],
      ),
    ).rejects.toMatchObject({ code: '23514' }));
  it('has justified query indexes', async () => {
    const rows = await pool.query<{ indexname: string }>(
      `select indexname from pg_indexes where tablename in ('intelligence_market_measures','short_selling_activity_observations')`,
    );
    expect(rows.rows.map((r) => r.indexname)).toEqual(
      expect.arrayContaining([
        'intelligence_market_measure_instrument_period_idx',
        'intelligence_market_measure_type_period_idx',
        'short_selling_activity_instrument_date_idx',
      ]),
    );
  });
  it('contains no raw provider payload column', async () => {
    const rows = await pool.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_name in ('intelligence_market_measures','short_selling_activity_observations')`,
    );
    expect(rows.rows.map((r) => r.column_name)).not.toContain('raw_payload');
  });
});
