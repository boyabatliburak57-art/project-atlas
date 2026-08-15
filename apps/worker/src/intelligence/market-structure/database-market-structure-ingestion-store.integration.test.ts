import { createDatabase, runMigrations } from '@atlas/database';
import type { NormalizedMarketMeasure } from '@atlas/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DatabaseMarketStructureIngestionStore } from './database-market-structure-ingestion-store';

function testUrl() {
  const value = process.env.TEST_DATABASE_URL;
  if (!value || !new URL(value).pathname.slice(1).endsWith('_test'))
    throw new Error('TEST_DATABASE_URL with an _test database is required');
  return value;
}

describe('market structure worker persistence repair', () => {
  const { db, pool } = createDatabase(testUrl());
  let providerId = '';
  let instrumentId = '';
  const persistedRevisionId = '61000000-0000-4000-8000-000000000001';
  beforeAll(async () => {
    await pool.query('drop schema if exists public cascade');
    await pool.query('drop schema if exists drizzle cascade');
    await pool.query('create schema public');
    await runMigrations(db);
    providerId = (
      await pool.query<{ id: string }>(
        `insert into data_providers(code,name,status) values('measure-worker-test','Worker Test','active') returning id`,
      )
    ).rows[0]!.id;
    instrumentId = (
      await pool.query<{ id: string }>(
        `insert into instruments(symbol,normalized_symbol,name,market_code,currency_code,status) values('TST','TST','Test','BIST','TRY','active') returning id`,
      )
    ).rows[0]!.id;
    await pool.query(
      `insert into intelligence_market_measures(revision_id,measure_id,instrument_id,type,effective_from,published_at,status,source_reference,provider_id,provider_dataset,provider_revision,source_timestamp,available_at,delivery_mode,license_class,quality_state)
       values($1,'measure-repair',$2,'GROSS_SETTLEMENT','2026-08-15T09:30:00Z','2026-08-15T09:00:00Z','ACTIVE','https://provider.test/repair',$3,'measures','1','2026-08-15T09:00:30Z','2026-08-15T09:01:00Z','DELAYED','DELAYED_DISPLAY_ONLY','DELAYED')`,
      [persistedRevisionId, instrumentId, providerId],
    );
  });
  afterAll(() => pool.end());

  it('repairs a missing MarketEvent after a measure-only partial commit', async () => {
    const availableAt = new Date('2026-08-15T09:01:00Z');
    const record: NormalizedMarketMeasure = {
      supersedesProviderRevision: null,
      measure: {
        revisionId: '62000000-0000-4000-8000-000000000001',
        measureId: 'measure-repair',
        instrumentId,
        type: 'GROSS_SETTLEMENT',
        status: 'ACTIVE',
        publishedAt: new Date('2026-08-15T09:00:00Z'),
        availableAt,
        effectiveFrom: new Date('2026-08-15T09:30:00Z'),
        effectiveUntil: null,
        sourceReference: 'https://provider.test/repair',
        structuredAttributes: {},
        providerRevision: '1',
        supersedesRevisionId: null,
        correctionReason: null,
        ingestedAt: new Date('2026-08-15T09:02:00Z'),
        provenance: {
          providerId,
          providerDataset: 'measures',
          providerRevision: '1',
          sourceTimestamp: new Date('2026-08-15T09:00:30Z'),
          ingestedAt: new Date('2026-08-15T09:02:00Z'),
          availableAt,
          deliveryMode: 'DELAYED',
          license: {
            licenseClass: 'DELAYED_DISPLAY_ONLY',
            redistribution: ['EXPORT_PROHIBITED'],
          },
          quality: 'DELAYED',
        },
      },
    };
    const result = await new DatabaseMarketStructureIngestionStore(
      db,
    ).persistMeasures([record]);
    expect(result).toMatchObject({
      inserted: 0,
      duplicates: 1,
      eventsInserted: 1,
    });
    expect(
      (
        await pool.query<{ revision_id: string }>(
          `select revision_id from intelligence_market_events where provider_revision='1'`,
        )
      ).rows[0]?.revision_id,
    ).toBe(persistedRevisionId);
  });
});
