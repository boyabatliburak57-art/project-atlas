import { randomUUID } from 'node:crypto';

import { runMigrations } from '@atlas/database';
import { ConfigService } from '@nestjs/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';
import { PostgresInstitutionalReader } from './institutional.repository';

function databaseUrl() {
  const value = process.env.TEST_DATABASE_URL;
  if (!value || !new URL(value).pathname.slice(1).endsWith('_test'))
    throw new Error('TEST_DATABASE_URL with an _test database is required');
  return value;
}

describe('institutional PostgreSQL queries', () => {
  const connection = new ApiDatabase(
    new ConfigService({ DATABASE_URL: databaseUrl() }),
  );
  const reader = new PostgresInstitutionalReader(connection);
  let institutionId = '';

  beforeAll(async () => {
    await connection.pool.query('drop schema if exists public cascade');
    await connection.pool.query('drop schema if exists drizzle cascade');
    await connection.pool.query('create schema public');
    await runMigrations(connection.database);
    const providerId = randomUUID();
    const instrumentId = randomUUID();
    institutionId = randomUUID();
    await connection.pool.query(
      `insert into data_providers(id,code,name,status) values ($1,'institutional-query','Institutional Query','active')`,
      [providerId],
    );
    await connection.pool.query(
      `insert into instruments(id,symbol,normalized_symbol,name,market_code,currency_code,status) values ($1,'ASELS','ASELS','Aselsan','BIST','TRY','active')`,
      [instrumentId],
    );
    await connection.pool.query(
      `insert into intelligence_institutions(id,type,canonical_name,short_name,code,valid_from) values ($1,'BROKERAGE','Canonical Institution','Canonical','CI','2020-01-01')`,
      [institutionId],
    );
    for (let index = 0; index < 7; index += 1) {
      const day = String(7 + index).padStart(2, '0');
      await connection.pool.query(
        `insert into institutional_flow_observations (instrument_id,institution_id,trade_date,currency,buy_value,sell_value,net_value,coverage_ratio,as_of,data_cutoff,provider_id,provider_dataset,provider_revision,source_timestamp,available_at,delivery_mode,license_class,quality_state)
         values ($1,$2,$3,'TRY','100','20','80','0.8',now(),now(),$4,'akd-query',$5,now(),now(),'DELAYED','DELAYED_DISPLAY_ONLY','PARTIAL')`,
        [
          instrumentId,
          institutionId,
          `2026-08-${day}`,
          providerId,
          `flow-${index}`,
        ],
      );
    }
    await connection.pool.query(
      `insert into settlement_snapshots (instrument_id,institution_id,trade_date,settlement_date,holding_quantity,holding_ratio,change_quantity,change_ratio,residency,coverage_ratio,data_cutoff,provider_id,provider_dataset,provider_revision,source_timestamp,available_at,delivery_mode,license_class,quality_state)
       values ($1,$2,'2026-08-12','2026-08-14','1000','0.2','50','0.01','FOREIGN','0.7',now(),$3,'settlement-query','settlement-1',now(),now(),'DELAYED','DELAYED_DISPLAY_ONLY','PARTIAL')`,
      [instrumentId, institutionId, providerId],
    );
  }, 30_000);

  afterAll(async () => connection.onApplicationShutdown());

  it('aggregates exactly five observed sessions and returns canonical provenance', async () => {
    const rows = await reader.instrumentFlow({
      symbol: 'ASELS',
      from: '2026-08-01',
      to: '2026-08-14',
      sort: 'NET_BUY',
      limit: 20,
      afterInstitutionId: null,
      tradingSessionLimit: 5,
    });
    expect(rows[0]).toMatchObject({
      institutionId,
      netValue: '400.0000000000',
      provider: 'institutional-query',
      providerDataset: 'akd-query',
    });
  });

  it('serves bounded overview and institution projections without N+1 fan-out', async () => {
    const overview = await reader.overview({
      from: '2026-08-01',
      to: '2026-08-14',
      limit: 5,
      tradingSessionLimit: 5,
    });
    expect(overview.topBuyers).toHaveLength(1);
    expect(overview.topSellers).toHaveLength(1);
    const flows = await reader.institutionFlows({
      institutionId,
      from: '2026-08-01',
      to: '2026-08-14',
      limit: 20,
      tradingSessionLimit: 5,
    });
    expect(flows[0]).toMatchObject({
      symbol: 'ASELS',
      netValue: '400.0000000000',
    });
  });

  it('uses source residency for foreign settlement and keeps dates distinct', async () => {
    const rows = await reader.settlement({
      symbol: 'ASELS',
      settlementDate: null,
      sort: 'HOLDING',
      limit: 20,
      residency: 'FOREIGN',
    });
    expect(rows[0]).toMatchObject({
      residency: 'FOREIGN',
      tradeDate: '2026-08-12',
      settlementDate: '2026-08-14',
      provider: 'institutional-query',
    });
  });

  it('serves institution holdings without per-instrument queries', async () => {
    const rows = await reader.institutionHoldings({
      institutionId,
      settlementDate: null,
      limit: 20,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ symbol: 'ASELS' });
  });
});
