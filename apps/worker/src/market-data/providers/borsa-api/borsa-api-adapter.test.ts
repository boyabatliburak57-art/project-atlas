import type { CacheBackend } from '@atlas/domain';
import { describe, expect, it, vi } from 'vitest';

import { ProviderRegistry } from '../provider-registry';
import {
  BORSA_API_PROVIDER_METADATA,
  BorsaApiAdapter,
  classifyBorsaApiError,
  normalizeBorsaSymbol,
  type BorsaApiClient,
} from './borsa-api-adapter';

const receivedAt = new Date('2026-07-27T12:00:00.000Z');
const request = {
  providerSymbol: 'THYAO',
  timeframe: '1d' as const,
  from: new Date('2026-07-01T00:00:00.000Z'),
  to: new Date('2026-07-03T00:00:00.000Z'),
};
const payload = {
  meta: { symbol: 'THYAO' },
  quotes: [
    {
      date: new Date('2026-07-01T00:00:00.000Z'),
      open: 100,
      high: 110,
      low: 95,
      close: 105,
      adjClose: 104.5,
      volume: 1234,
    },
  ],
};

class MemoryCache implements CacheBackend {
  readonly values = new Map<string, string>();
  readonly ttls: number[] = [];
  get(key: string) {
    return Promise.resolve(this.values.get(key) ?? null);
  }
  set(key: string, value: string, ttl: number) {
    this.values.set(key, value);
    this.ttls.push(ttl);
    return Promise.resolve();
  }
  delete(key: string) {
    this.values.delete(key);
    return Promise.resolve();
  }
  invalidateScopes() {
    return Promise.resolve(0);
  }
}

function client(overrides: Partial<BorsaApiClient> = {}): BorsaApiClient {
  return {
    getStock: vi.fn().mockResolvedValue({ symbol: 'THYAO' }),
    getIndex: vi.fn().mockResolvedValue({ symbol: 'XU100' }),
    getHistoricalData: vi.fn().mockResolvedValue(payload),
    ...overrides,
  };
}

describe('BorsaApiAdapter', () => {
  it('normalizes application symbols and prevents a double .IS suffix', () => {
    expect(normalizeBorsaSymbol(' thyao.IS.IS ')).toBe('THYAO');
    expect(() => normalizeBorsaSymbol('../THYAO')).toThrowError(
      expect.objectContaining({ code: 'PROVIDER_INVALID_SYMBOL_MAPPING' }),
    );
  });

  it('advertises only delayed daily, weekly and monthly OHLCV', () => {
    const adapter = new BorsaApiAdapter({ client: client() });
    expect(adapter.getCapabilities()).toMatchObject({
      supportedTimeframes: ['1d', '1w', '1mo'],
      dataMode: 'delayed',
      supportsCorporateActions: false,
      supportsFundamentals: false,
      rateLimit: { requests: 1, intervalMs: 1_000 },
    });
    expect(BORSA_API_PROVIDER_METADATA).toMatchObject({
      integrationStatus: 'SANDBOX_INTEGRATION',
      productionEligible: false,
      officialExchangeFeed: false,
      credentialRequired: false,
    });
  });

  it('maps historical payload without inventing a source timestamp', async () => {
    const adapter = new BorsaApiAdapter({
      client: client(),
      now: () => receivedAt,
      sleep: () => Promise.resolve(),
    });
    const result = await adapter.fetchBars(request);
    expect(result.bars[0]).toEqual({
      providerSymbol: 'THYAO',
      timeframe: '1d',
      openTime: new Date('2026-07-01T00:00:00.000Z'),
      closeTime: new Date('2026-07-02T00:00:00.000Z'),
      open: '100',
      high: '110',
      low: '95',
      close: '105',
      adjustedClose: '104.5',
      volume: '1234',
      isClosed: true,
      availableAt: receivedAt,
      receivedAt,
      providerRevision: 'received-2026-07-27T12:00:00.000Z',
      qualityFlags: [
        'SOURCE_TIMESTAMP_UNAVAILABLE',
        'DELAYED',
        'UNOFFICIAL_SOURCE',
      ],
    });
    expect(result.bars[0]).not.toHaveProperty('sourceTimestamp');
  });

  it('rejects invalid OHLCV as a non-retryable provider payload error', async () => {
    const broken = {
      ...payload,
      quotes: [{ ...payload.quotes[0], high: 90 }],
    };
    const getHistoricalData = vi.fn().mockResolvedValue(broken);
    const adapter = new BorsaApiAdapter({
      client: client({ getHistoricalData }),
      sleep: () => Promise.resolve(),
    });
    await expect(adapter.fetchBars(request)).rejects.toMatchObject({
      code: 'PROVIDER_MALFORMED_RESPONSE',
      retryable: false,
    });
    expect(getHistoricalData).toHaveBeenCalledOnce();
  });

  it('retries transient network failures with bounded attempts', async () => {
    const getHistoricalData = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error('network'), { code: 'EAI_AGAIN' }),
      )
      .mockResolvedValue(payload);
    const adapter = new BorsaApiAdapter({
      client: client({ getHistoricalData }),
      maxAttempts: 2,
      sleep: () => Promise.resolve(),
    });
    await expect(adapter.fetchBars(request)).resolves.toHaveProperty('bars');
    expect(getHistoricalData).toHaveBeenCalledTimes(2);
  });

  it('maps 429, timeout, network, not-found and upstream failures', () => {
    expect(classifyBorsaApiError({ response: { status: 429 } }).code).toBe(
      'PROVIDER_RATE_LIMITED',
    );
    expect(classifyBorsaApiError({ code: 'ETIMEDOUT' }).code).toBe(
      'PROVIDER_TIMEOUT',
    );
    expect(classifyBorsaApiError({ code: 'ECONNRESET' }).code).toBe(
      'PROVIDER_UNAVAILABLE',
    );
    expect(classifyBorsaApiError({ response: { status: 404 } }).retryable).toBe(
      false,
    );
    expect(classifyBorsaApiError(new Error('upstream failed')).code).toBe(
      'PROVIDER_UNAVAILABLE',
    );
  });

  it('uses provider/symbol/interval/range cache keys and six-hour bar TTL', async () => {
    const cache = new MemoryCache();
    const getHistoricalData = vi.fn().mockResolvedValue(payload);
    const adapter = new BorsaApiAdapter({
      cache,
      client: client({ getHistoricalData }),
      now: () => receivedAt,
      sleep: () => Promise.resolve(),
    });
    await adapter.fetchBars(request);
    await adapter.fetchBars(request);
    expect(getHistoricalData).toHaveBeenCalledOnce();
    expect(cache.ttls).toEqual([21_600]);
    expect([...cache.values.keys()][0]).toContain(
      'borsa-api:bars:THYAO:1d:2026-07-01T00:00:00.000Z:2026-07-03T00:00:00.000Z',
    );
  });

  it('registers and resolves through the existing provider registry', () => {
    const registry = new ProviderRegistry();
    registry.register(new BorsaApiAdapter({ client: client() }));
    expect(registry.resolve('borsa-api').code).toBe('borsa-api');
    expect(registry.listCodes()).toEqual(['borsa-api']);
  });
});
