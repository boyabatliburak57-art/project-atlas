import { describe, expect, it, vi } from 'vitest';
import { ATLAS_JOB_NAMES } from '@atlas/types';
import { createMarketDataComposition } from '../../market-data/market-data-composition';
import { createMarketStructureJobId } from '../../queue/queue-contracts';

describe('MARKET_MEASURE_SYNC registration', () => {
  const data = {
    providerCode: 'missing-provider',
    from: '2026-08-01T00:00:00.000Z',
    to: '2026-08-15T00:00:00.000Z',
    cursor: null,
    limit: 200,
    correlationId: 'registration-test',
    dataset: 'MEASURES' as const,
  };
  it('uses a deterministic bounded job identity', () =>
    expect(createMarketStructureJobId(data)).toBe(
      createMarketStructureJobId(data),
    ));
  it('registers the canonical job name', () =>
    expect(ATLAS_JOB_NAMES.marketMeasureSync).toBe(
      'intelligence.market-measure-sync.v1',
    ));
  it('fails closed through composition when no provider is registered', async () => {
    const composition = createMarketDataComposition({
      database: {} as never,
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      } as never,
      providerAdapters: [],
    });
    await expect(
      composition.process({
        name: ATLAS_JOB_NAMES.marketMeasureSync,
        data,
        id: 'job-id',
      } as never),
    ).rejects.toThrow('MARKET_MEASURE_PROVIDER_REQUIRED');
  });
});
