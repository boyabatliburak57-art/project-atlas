import { createDatabase, runMigrations } from '@atlas/database';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PostgresEventReader } from './events.repository';

const watchlistUser = '00000000-0000-4000-a000-000000000101';
const portfolioUser = '00000000-0000-4000-a000-000000000102';
const otherUser = '00000000-0000-4000-a000-000000000103';
const revisionId = '30000000-0000-4000-a000-000000000001';
const correctionId = '30000000-0000-4000-a000-000000000002';

describe('KAP feed PostgreSQL projection', () => {
  const { db, pool } = createDatabase(requireTestDatabaseUrl());
  const reader = new PostgresEventReader({ pool } as never);
  let companyId = '';

  beforeAll(async () => {
    await pool.query('drop schema if exists public cascade');
    await pool.query('drop schema if exists drizzle cascade');
    await pool.query('create schema public');
    await runMigrations(db);
    const providerId = (
      await pool.query<{ id: string }>(
        `insert into data_providers (code,name,status) values ('kap-source','KAP Source','active') returning id`,
      )
    ).rows[0]!.id;
    const instrumentId = (
      await pool.query<{ id: string }>(
        `insert into instruments (symbol,normalized_symbol,name,market_code,currency_code,status) values ('TEST','TEST','Test Şirket','BIST','TRY','active') returning id`,
      )
    ).rows[0]!.id;
    companyId = (
      await pool.query<{ id: string }>(
        `insert into intelligence_companies (canonical_name,primary_instrument_id,active) values ('Test Şirket',$1,true) returning id`,
        [instrumentId],
      )
    ).rows[0]!.id;
    await pool.query(
      `insert into intelligence_provider_capabilities (provider_id,capability,availability,health,checked_at) values ($1,'disclosure.kap','SUPPORTED_DELAYED','HEALTHY',now())`,
      [providerId],
    );
    await insertDisclosure({
      providerId,
      id: revisionId,
      providerRevision: '1',
      state: 'ACTIVE',
      title: 'Temettü kararı',
    });
    await insertDisclosure({
      providerId,
      id: correctionId,
      providerRevision: '2',
      state: 'CORRECTED',
      title: 'Düzeltilmiş temettü kararı',
    });
    await pool.query(
      `insert into corporate_disclosure_revision_links (child_revision_id,parent_revision_id,supersedes_provider_revision,resolution_state,resolved_at) values ($1,$2,'1','COMPLETE',now())`,
      [correctionId, revisionId],
    );
    await pool.query(
      `insert into corporate_disclosure_entities (disclosure_revision_id,entity_type,company_id) values ($1,'COMPANY',$2),($3,'COMPANY',$2)`,
      [revisionId, companyId, correctionId],
    );
    await pool.query(
      `insert into corporate_disclosure_entities (disclosure_revision_id,entity_type,instrument_id) values ($1,'INSTRUMENT',$2),($3,'INSTRUMENT',$2)`,
      [revisionId, instrumentId, correctionId],
    );
    await pool.query(
      `insert into intelligence_market_events (revision_id,event_id,event_type,entity_type,entity_id,published_at,source_reference,attributes,provider_id,provider_dataset,provider_revision,source_timestamp,ingested_at,available_at,delivery_mode,license_class,redistribution_classes,quality_state) values ($1,$1,'DIVIDEND','COMPANY',$2,'2026-08-13T12:00:00Z','https://kap.example.test/1','{}',$3,'kap-v1','1','2026-08-13T12:00:30Z','2026-08-13T12:02:00Z','2026-08-13T12:01:00Z','DELAYED','DELAYED_DISPLAY_ONLY','["EXPORT_PROHIBITED"]','DELAYED'),($4,$4,'DIVIDEND','COMPANY',$2,'2026-08-13T12:03:00Z','https://kap.example.test/2','{}',$3,'kap-v1','2','2026-08-13T12:03:30Z','2026-08-13T12:05:00Z','2026-08-13T12:04:00Z','DELAYED','DELAYED_DISPLAY_ONLY','["EXPORT_PROHIBITED"]','CORRECTED')`,
      [revisionId, companyId, providerId, correctionId],
    );
    const watchlistId = (
      await pool.query<{ id: string }>(
        `insert into watchlists (owner_user_id,name) values ($1,'Takip') returning id`,
        [watchlistUser],
      )
    ).rows[0]!.id;
    await pool.query(
      `insert into watchlist_items (watchlist_id,instrument_id) values ($1,$2)`,
      [watchlistId, instrumentId],
    );
    const portfolioId = (
      await pool.query<{ id: string }>(
        `insert into portfolios (user_id,name) values ($1,'Portföy') returning id`,
        [portfolioUser],
      )
    ).rows[0]!.id;
    await pool.query(
      `insert into portfolio_positions (portfolio_id,instrument_id,quantity,average_cost,cost_basis,projection_ledger_version,calculated_at) values ($1,$2,1,1,1,1,now())`,
      [portfolioId, instrumentId],
    );

    async function insertDisclosure(input: {
      providerId: string;
      id: string;
      providerRevision: string;
      state: string;
      title: string;
    }) {
      await pool.query(
        `insert into corporate_disclosure_revisions (revision_id,disclosure_id,external_disclosure_id,company_id,disclosure_type,state,category,title,published_at,source_reference,normalized_attributes,provider_id,provider_dataset,provider_revision,source_timestamp,ingested_at,available_at,delivery_mode,license_class,redistribution_classes,quality_state) values ($1,'10000000-0000-4000-a000-000000000001','KAP-1',$2,'DIVIDEND',$3,'DIVIDEND',$4,$5,'https://kap.example.test/1','{"sourceCategory":"DIVIDEND"}',$6,'kap-v1',$7,$8,$9,$10,'DELAYED','DELAYED_DISPLAY_ONLY','["EXPORT_PROHIBITED"]','DELAYED')`,
        [
          input.id,
          companyId,
          input.state,
          input.title,
          input.providerRevision === '1'
            ? '2026-08-13T12:00:00Z'
            : '2026-08-13T12:03:00Z',
          input.providerId,
          input.providerRevision,
          input.providerRevision === '1'
            ? '2026-08-13T12:00:30Z'
            : '2026-08-13T12:03:30Z',
          input.providerRevision === '1'
            ? '2026-08-13T12:02:00Z'
            : '2026-08-13T12:05:00Z',
          input.providerRevision === '1'
            ? '2026-08-13T12:01:00Z'
            : '2026-08-13T12:04:00Z',
        ],
      );
    }
  }, 30_000);

  afterAll(async () => pool.end());

  it('returns only latest revision and derives correction links without mutating history', async () => {
    const rows = await reader.feed(query(otherUser));
    expect(rows.map((row) => row.revisionId)).toEqual([correctionId]);
    expect(rows[0]).toMatchObject({
      supersedesRevisionId: revisionId,
      state: 'CORRECTED',
    });
    const history = await reader.revisions(
      '10000000-0000-4000-a000-000000000001',
      otherUser,
    );
    expect(history).toHaveLength(2);
    expect(history.find((row) => row.revisionId === revisionId)?.state).toBe(
      'SUPERSEDED',
    );
  });

  it('isolates watchlist and portfolio relevance by authenticated user', async () => {
    expect((await reader.feed(query(watchlistUser)))[0]).toMatchObject({
      watchlistRelevant: true,
      portfolioRelevant: false,
    });
    expect((await reader.feed(query(portfolioUser)))[0]).toMatchObject({
      watchlistRelevant: false,
      portfolioRelevant: true,
    });
    expect((await reader.feed(query(otherUser)))[0]).toMatchObject({
      watchlistRelevant: false,
      portfolioRelevant: false,
    });
  });

  it('supports company, symbol, search and cursor filters with deterministic bounds', async () => {
    expect(await reader.feed({ ...query(otherUser), companyId })).toHaveLength(
      1,
    );
    expect(
      await reader.feed({ ...query(otherUser), symbol: 'TEST' }),
    ).toHaveLength(1);
    expect(
      await reader.feed({ ...query(otherUser), search: 'düzeltilmiş' }),
    ).toHaveLength(1);
    expect(
      await reader.feed({
        ...query(otherUser),
        cursor: {
          publishedAt: new Date('2026-08-13T12:03:00Z'),
          revisionId: correctionId,
        },
      }),
    ).toHaveLength(0);
  });
});

function query(userId: string) {
  return {
    userId,
    categories: [] as string[],
    states: [] as string[],
    companyId: null,
    symbol: null,
    relevance: null,
    search: null,
    from: new Date('2026-08-01'),
    to: new Date('2026-08-31'),
    limit: 20,
    cursor: null,
  };
}

function requireTestDatabaseUrl() {
  const value = process.env.TEST_DATABASE_URL;
  if (!value || !new URL(value).pathname.slice(1).endsWith('_test'))
    throw new Error('TEST_DATABASE_URL with an _test database is required');
  return value;
}
