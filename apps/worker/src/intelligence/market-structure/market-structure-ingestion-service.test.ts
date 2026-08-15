import { describe, expect, it, vi } from 'vitest';
import type {
  MarketStructureIngestionStore,
  MarketStructureProviderAdapter,
} from './contracts';
import {
  MarketStructureIngestionError,
  MarketStructureIngestionService,
} from './market-structure-ingestion-service';

const license = {
  licenseClass: 'DISPLAY_ALLOWED' as const,
  redistribution: ['DISPLAY_ALLOWED' as const],
};
const mapping = {
  providerId: 'provider-id',
  entityType: 'INSTRUMENT' as const,
  externalId: 'ASELS',
  canonicalEntityId: '10000000-0000-4000-8000-000000000001',
  validFrom: new Date('2020-01-01'),
  validTo: null,
  confidence: 1,
  status: 'RESOLVED' as const,
  source: 'contract',
  manualReviewState: 'APPROVED' as const,
};
const raw = {
  sourceId: 'm1',
  externalInstrumentId: 'ASELS',
  sourceType: 'GROSS_SETTLEMENT',
  sourceStatus: 'ACTIVE',
  publishedAt: '2026-08-15T09:00:00Z',
  availableAt: '2026-08-15T09:01:00Z',
  effectiveFrom: '2026-08-15T09:30:00Z',
  effectiveUntil: null,
  sourceTimestamp: '2026-08-15T09:00:30Z',
  sourceReference: 'https://provider.test/m1',
  providerRevision: '1',
};
function provider(
  overrides: Partial<MarketStructureProviderAdapter> = {},
): MarketStructureProviderAdapter {
  return {
    code: 'market-provider',
    dataset: 'market-measures-v1',
    deliveryMode: 'DELAYED',
    license,
    fetchMarketMeasures: vi
      .fn()
      .mockResolvedValue({ items: [raw], nextCursor: 'page-2' }),
    fetchShortSellingActivity: vi.fn().mockResolvedValue({
      items: [
        {
          sourceId: 's1',
          externalInstrumentId: 'ASELS',
          tradeDate: '2026-08-15',
          quantity: '10',
          dataCutoff: '2026-08-15T15:00:00Z',
          availableAt: '2026-08-15T15:01:00Z',
          sourceTimestamp: '2026-08-15T15:00:30Z',
          providerRevision: '1',
        },
      ],
      nextCursor: null,
    }),
    ...overrides,
  };
}
function store(
  overrides: Partial<MarketStructureIngestionStore> = {},
): MarketStructureIngestionStore {
  return {
    resolveContext: vi.fn().mockResolvedValue({
      providerId: 'provider-id',
      providerConnectionId: 'connection-id',
      mappings: [mapping],
    }),
    beginRun: vi.fn().mockResolvedValue({ runId: 'run-id', completed: false }),
    persistMeasures: vi
      .fn()
      .mockResolvedValue({ inserted: 1, duplicates: 0, eventsInserted: 1 }),
    persistActivities: vi
      .fn()
      .mockResolvedValue({ inserted: 1, duplicates: 0 }),
    completeRun: vi.fn().mockResolvedValue(undefined),
    failRun: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
const input = {
  from: new Date('2026-08-01'),
  to: new Date('2026-08-15'),
  cursor: null,
  limit: 200,
  correlationId: 'correlation',
};
describe('MARKET_MEASURE_SYNC focused worker contract', () => {
  it('normalizes and persists measures with an event', async () =>
    expect(
      await new MarketStructureIngestionService(
        provider(),
        store(),
      ).executeMeasures(input),
    ).toMatchObject({ inserted: 1, eventsInserted: 1, nextCursor: 'page-2' }));
  it('persists short-selling activity separately', async () =>
    expect(
      await new MarketStructureIngestionService(
        provider(),
        store(),
      ).executeActivity(input),
    ).toMatchObject({ inserted: 1 }));
  it('fails closed without provider', () =>
    expect(
      new MarketStructureIngestionService(null, store()).executeMeasures(input),
    ).rejects.toMatchObject({ code: 'MARKET_MEASURE_PROVIDER_REQUIRED' }));
  it('gates activity when provider lacks capability', () => {
    const p = provider();
    const withoutActivity: MarketStructureProviderAdapter = {
      code: p.code,
      dataset: p.dataset,
      deliveryMode: p.deliveryMode,
      license: p.license,
      fetchMarketMeasures: (request) => p.fetchMarketMeasures(request),
    };
    return expect(
      new MarketStructureIngestionService(
        withoutActivity,
        store(),
      ).executeActivity(input),
    ).rejects.toMatchObject({ code: 'SHORT_SELLING_PROVIDER_REQUIRED' });
  });
  it('bounds backfill windows', () =>
    expect(
      new MarketStructureIngestionService(provider(), store()).executeMeasures({
        ...input,
        from: new Date('2020-01-01'),
      }),
    ).rejects.toBeInstanceOf(MarketStructureIngestionError));
  it('bounds page size', () =>
    expect(
      new MarketStructureIngestionService(provider(), store()).executeMeasures({
        ...input,
        limit: 501,
      }),
    ).rejects.toMatchObject({ code: 'MARKET_MEASURE_RANGE_INVALID' }));
  it('checkpoints successful pages', async () => {
    const completeRun = vi.fn().mockResolvedValue(undefined);
    const s = store({ completeRun });
    await new MarketStructureIngestionService(provider(), s).executeMeasures(
      input,
    );
    expect(completeRun).toHaveBeenCalledWith(
      expect.objectContaining({ sourceCursor: 'page-2', recordsAccepted: 1 }),
    );
  });
  it('replays completed idempotency keys without fetching', async () => {
    const fetchMarketMeasures = vi
      .fn()
      .mockResolvedValue({ items: [raw], nextCursor: null });
    const p = provider({ fetchMarketMeasures });
    const result = await new MarketStructureIngestionService(
      p,
      store({
        beginRun: vi.fn().mockResolvedValue({ runId: 'r', completed: true }),
      }),
    ).executeMeasures(input);
    expect(result.replayed).toBe(true);
    expect(fetchMarketMeasures).not.toHaveBeenCalled();
  });
  it('rejects malformed rows without zero filling', async () => {
    const s = store({
      persistMeasures: vi
        .fn()
        .mockResolvedValue({ inserted: 0, duplicates: 0, eventsInserted: 0 }),
    });
    const p = provider({
      fetchMarketMeasures: vi.fn().mockResolvedValue({
        items: [{ ...raw, effectiveUntil: '2020-01-01T00:00:00Z' }],
        nextCursor: null,
      }),
    });
    expect(
      await new MarketStructureIngestionService(p, s).executeMeasures(input),
    ).toMatchObject({ rejected: 1, inserted: 0 });
  });
  it('records provider failures for retry handling', async () => {
    const failRun = vi.fn().mockResolvedValue(undefined);
    const s = store({ failRun });
    const p = provider({
      fetchMarketMeasures: vi.fn().mockRejectedValue(new Error('RATE_LIMITED')),
    });
    await expect(
      new MarketStructureIngestionService(p, s).executeMeasures(input),
    ).rejects.toThrow('RATE_LIMITED');
    expect(failRun).toHaveBeenCalled();
  });
  it('rejects overlapping revisions without a supersession relationship', async () => {
    const persistMeasures = vi
      .fn()
      .mockResolvedValue({ inserted: 1, duplicates: 0, eventsInserted: 1 });
    const p = provider({
      fetchMarketMeasures: vi.fn().mockResolvedValue({
        items: [raw, { ...raw, providerRevision: '2' }],
        nextCursor: null,
      }),
    });
    const result = await new MarketStructureIngestionService(
      p,
      store({ persistMeasures }),
    ).executeMeasures(input);
    expect(result.rejected).toBe(1);
    expect(persistMeasures).toHaveBeenCalledWith(
      expect.arrayContaining([expect.any(Object)]),
    );
    expect(vi.mocked(persistMeasures).mock.calls[0]?.[0]).toHaveLength(1);
  });
});
