import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDatabase } from '../client';
import { runMigrations } from '../migration';

function requireTestDatabaseUrl(): string {
  const value = process.env.TEST_DATABASE_URL;
  if (!value || !new URL(value).pathname.slice(1).endsWith('_test'))
    throw new Error('TEST_DATABASE_URL with an _test database is required');
  return value;
}

const tables = [
  'intelligence_institutions',
  'intelligence_companies',
  'intelligence_funds',
  'derivative_contracts',
  'intelligence_external_identity_mappings',
  'intelligence_provider_capabilities',
  'corporate_disclosure_entities',
  'corporate_disclosure_revision_links',
  'corporate_disclosure_revisions',
  'intelligence_market_events',
  'institutional_flow_observations',
  'settlement_snapshots',
  'intelligence_market_measures',
  'fund_holding_revisions',
] as const;

describe('BIST intelligence PostgreSQL foundation', () => {
  const { db, pool } = createDatabase(requireTestDatabaseUrl());
  let providerId = '';
  let instrumentId = '';
  let institutionId = '';
  let fundId = '';

  beforeAll(async () => {
    await pool.query('drop schema if exists public cascade');
    await pool.query('drop schema if exists drizzle cascade');
    await pool.query('create schema public');
    await runMigrations(db);
    providerId = (
      await pool.query<{ id: string }>(
        `insert into data_providers (code,name,status) values ('intelligence-fixture','Fixture','active') returning id`,
      )
    ).rows[0]!.id;
    instrumentId = (
      await pool.query<{ id: string }>(
        `insert into instruments (symbol,normalized_symbol,name,market_code,currency_code,status) values ('TST','TST','Test','BIST','TRY','active') returning id`,
      )
    ).rows[0]!.id;
    institutionId = (
      await pool.query<{ id: string }>(
        `insert into intelligence_institutions (type,canonical_name,code,valid_from) values ('BROKERAGE','Canonical Brokerage','CB','2020-01-01') returning id`,
      )
    ).rows[0]!.id;
    fundId = (
      await pool.query<{ id: string }>(
        `insert into intelligence_funds (name,code,type,manager_institution_id,currency) values ('Canonical Fund','CF','EQUITY',$1,'TRY') returning id`,
        [institutionId],
      )
    ).rows[0]!.id;
  });
  afterAll(async () => pool.end());

  it('clean-migrates the stable canonical foundation', async () => {
    const result = await pool.query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema='public' and table_name=any($1::text[]) order by table_name`,
      [tables],
    );
    expect(result.rows.map((row) => row.table_name)).toEqual(
      [...tables].sort(),
    );
  });

  it('resolves external identity without manufacturing a canonical entity', async () => {
    const canonical = randomUUID();
    await pool.query(
      `insert into intelligence_external_identity_mappings (provider_id,entity_type,external_id,canonical_entity_id,valid_from,status,source,manual_review_state) values ($1,'INSTRUMENT','vendor-tst',$2,now(),'RESOLVED','contract','APPROVED')`,
      [providerId, canonical],
    );
    await expect(
      pool.query(
        `insert into intelligence_external_identity_mappings (provider_id,entity_type,external_id,valid_from,status,source,manual_review_state) values ($1,'FUND','bad',now(),'RESOLVED','contract','PENDING')`,
        [providerId],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('keeps product availability and runtime health in separate columns', async () => {
    await pool.query(
      `insert into intelligence_provider_capabilities (provider_id,capability,availability,health,checked_at) values ($1,'institutional.akd','LICENSE_REQUIRED','UNAVAILABLE',now())`,
      [providerId],
    );
    const row = (
      await pool.query<{ availability: string; health: string }>(
        `select availability,health from intelligence_provider_capabilities where capability='institutional.akd'`,
      )
    ).rows[0];
    expect(row).toEqual({
      availability: 'LICENSE_REQUIRED',
      health: 'UNAVAILABLE',
    });
  });

  it('enforces institutional flow idempotency and immutable revisions', async () => {
    const revision = 'provider-r1';
    const values = [instrumentId, institutionId, providerId, revision];
    const statement = `insert into institutional_flow_observations (instrument_id,institution_id,trade_date,currency,as_of,data_cutoff,provider_id,provider_dataset,provider_revision,source_timestamp,available_at,delivery_mode,license_class,quality_state) values ($1,$2,'2026-08-12','TRY',now(),now(),$3,'akd',$4,now(),now(),'DELAYED','DELAYED_DISPLAY_ONLY','DELAYED') returning revision_id`;
    const id = (await pool.query<{ revision_id: string }>(statement, values))
      .rows[0]!.revision_id;
    await expect(pool.query(statement, values)).rejects.toMatchObject({
      code: '23505',
    });
    await expect(
      pool.query(
        `update institutional_flow_observations set net_value='1' where revision_id=$1`,
        [id],
      ),
    ).rejects.toMatchObject({ code: 'P0001' });
  });

  it('stores exact institutional metrics while constraining ratios', async () => {
    await pool.query(
      `insert into institutional_flow_observations
       (instrument_id,institution_id,trade_date,currency,buy_value,sell_value,net_value,buy_average_price,sell_average_price,total_volume,market_share,coverage_ratio,as_of,data_cutoff,provider_id,provider_dataset,provider_revision,source_timestamp,available_at,delivery_mode,license_class,quality_state)
       values ($1,$2,'2026-08-13','TRY','1000000000000.1234','999999999999.1234','1.0000','123.456789','123.400001','1999999999999.2468','0.250000','0.800000',now(),now(),$3,'akd','precision-r1',now(),now(),'DELAYED','DELAYED_DISPLAY_ONLY','PARTIAL')`,
      [instrumentId, institutionId, providerId],
    );
    const row = (
      await pool.query<{ net_value: string; coverage_ratio: string }>(
        `select net_value::text,coverage_ratio::text from institutional_flow_observations where provider_revision='precision-r1'`,
      )
    ).rows[0]!;
    expect(row.net_value).toBe('1.0000000000');
    expect(row.coverage_ratio).toBe('0.800000000000');
    await expect(
      pool.query(
        `insert into institutional_flow_observations (instrument_id,institution_id,trade_date,currency,coverage_ratio,as_of,data_cutoff,provider_id,provider_dataset,provider_revision,source_timestamp,available_at,delivery_mode,license_class,quality_state) values ($1,$2,'2026-08-14','TRY','1.1',now(),now(),$3,'akd','bad-coverage',now(),now(),'DELAYED','DELAYED_DISPLAY_ONLY','PARTIAL')`,
        [instrumentId, institutionId, providerId],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('keeps trade-date distinct from settlement-date and deduplicates snapshots', async () => {
    const values = [instrumentId, institutionId, providerId];
    const statement = `insert into settlement_snapshots (instrument_id,institution_id,trade_date,settlement_date,residency,data_cutoff,provider_id,provider_dataset,provider_revision,source_timestamp,available_at,delivery_mode,license_class,quality_state) values ($1,$2,'2026-08-12','2026-08-14','UNKNOWN',now(),$3,'settlement','r1',now(),now(),'DELAYED','DELAYED_DISPLAY_ONLY','DELAYED')`;
    await pool.query(statement, values);
    await expect(pool.query(statement, values)).rejects.toMatchObject({
      code: '23505',
    });
    const row = (
      await pool.query<{ trade_date: string; settlement_date: string }>(
        `select trade_date,settlement_date from settlement_snapshots limit 1`,
      )
    ).rows[0]!;
    expect(String(row.trade_date)).not.toBe(String(row.settlement_date));
  });

  it('rejects invalid settlement ratios and residency classifications', async () => {
    const base = `insert into settlement_snapshots (instrument_id,institution_id,settlement_date,residency,holding_ratio,data_cutoff,provider_id,provider_dataset,provider_revision,source_timestamp,available_at,delivery_mode,license_class,quality_state) values ($1,$2,'2026-08-15',$4,$5,now(),$3,'settlement',$6,now(),now(),'DELAYED','DELAYED_DISPLAY_ONLY','PARTIAL')`;
    await expect(
      pool.query(base, [
        instrumentId,
        institutionId,
        providerId,
        'FOREIGN',
        '1.01',
        'bad-ratio',
      ]),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      pool.query(base, [
        instrumentId,
        institutionId,
        providerId,
        'INFERRED',
        '0.2',
        'bad-residency',
      ]),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('preserves fund holding revisions and derivative identity', async () => {
    await pool.query(
      `insert into derivative_contracts (underlying_instrument_id,contract_code,type,expiry,multiplier,currency,settlement_type) values ($1,'F_XU0300826','FUTURE','2026-08-31T15:00:00Z','10','TRY','CASH')`,
      [instrumentId],
    );
    const insert = `insert into fund_holding_revisions (fund_id,instrument_id,reporting_date,published_at,provider_id,provider_dataset,provider_revision,source_timestamp,available_at,delivery_mode,license_class,quality_state) values ($1,$2,'2026-07-31',now(),$3,'fund-holdings',$4,now(),now(),'DELAYED','DISPLAY_ALLOWED','COMPLETE')`;
    await pool.query(insert, [fundId, instrumentId, providerId, 'r1']);
    await pool.query(insert, [fundId, instrumentId, providerId, 'r2']);
    expect(
      (await pool.query(`select 1 from fund_holding_revisions`)).rowCount,
    ).toBe(2);
    await expect(
      pool.query(
        `insert into derivative_contracts (underlying_instrument_id,contract_code,type,expiry,multiplier,currency,settlement_type) values ($1,'F_XU0300826','FUTURE','2026-08-31T15:00:00Z','10','TRY','CASH')`,
        [instrumentId],
      ),
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('stores normalized event attributes but no raw provider payload column', async () => {
    const columns = await pool.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_name in ('corporate_disclosure_revisions','intelligence_market_events')`,
    );
    expect(columns.rows.map((row) => row.column_name)).not.toContain(
      'raw_payload',
    );
  });
});
