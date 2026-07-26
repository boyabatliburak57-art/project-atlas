import { describe, expect, it } from 'vitest';

import { validateBars } from '../../bars/validate-bars';
import { ProviderContractError } from '../errors';
import type {
  ProviderHttpRequest,
  ProviderHttpResponse,
  ProviderHttpTransport,
  VendorMarketDataConfiguration,
} from './contracts';
import { VendorMarketDataAdapter } from './vendor-market-data-adapter';

const capabilities = {
  supportedTimeframes: ['1h', '1d'] as const,
  dataMode: 'delayed' as const,
  historicalDepthDays: 3650,
  supportsCorporateActions: false,
  supportsFundamentals: false,
  supportsPagination: true,
  rateLimit: { requests: 100, intervalMs: 60_000 },
};

const configuration: VendorMarketDataConfiguration = {
  code: 'selected-vendor',
  baseUrl: 'https://market-data.invalid/v1/',
  endpoints: {
    health: 'health',
    instruments: 'instruments',
    bars: 'bars',
    calendar: 'calendar',
    memberships: 'memberships',
    benchmarks: 'benchmarks',
  },
  credential: {
    store: 'secretStore',
    reference: 'providers/selected-vendor',
  },
  capabilities,
  license: {
    licenseId: 'contract-required',
    attribution: null,
    redistribution: 'internalOnly',
  },
  timeoutMs: 2_000,
  maxAttempts: 2,
  baseBackoffMs: 0,
};

const instrumentFixture = {
  providerSymbol: 'THYAO.IS',
  symbol: 'THYAO',
  name: 'Türk Hava Yolları A.O.',
  marketCode: 'BIST',
  currencyCode: 'TRY',
  isin: 'TRATHYAO91M5',
  status: 'active',
  listedAt: '1990-01-01T00:00:00.000Z',
  delistedAt: undefined,
};

const dailyBar = {
  providerSymbol: 'THYAO.IS',
  timeframe: '1d',
  openTime: '2026-07-24T07:00:00.000Z',
  closeTime: '2026-07-24T15:00:00.000Z',
  open: '321.123456789012345678',
  high: '325.900000000000000001',
  low: '319.000000000000000009',
  close: '324.765432109876543219',
  volume: '12345678901234567890.00000001',
  isClosed: true,
  sourceTimestamp: '2026-07-24T15:00:01.000Z',
  availableAt: '2026-07-24T15:00:02.000Z',
  providerRevision: 'rev-1',
};

class QueueTransport implements ProviderHttpTransport {
  readonly requests: ProviderHttpRequest[] = [];

  constructor(
    private readonly outcomes: (
      | ProviderHttpResponse
      | Error
      | ProviderContractError
    )[],
  ) {}

  request(request: ProviderHttpRequest): Promise<ProviderHttpResponse> {
    this.requests.push(request);
    const outcome = this.outcomes.shift();
    if (outcome instanceof Error) return Promise.reject(outcome);
    if (outcome === undefined)
      return Promise.reject(new Error('No fixture response'));
    return Promise.resolve(outcome);
  }
}

const response = (
  body: unknown,
  status = 200,
  headers: Readonly<Record<string, string | undefined>> = {},
): ProviderHttpResponse => ({ status, headers, body });

function adapter(
  outcomes: ConstructorParameters<typeof QueueTransport>[0],
  credential = 'fixture-secret-that-must-never-be-reported',
) {
  const transport = new QueueTransport([...outcomes]);
  return {
    provider: new VendorMarketDataAdapter(configuration, transport, {
      resolve: () => Promise.resolve(credential),
    }),
    transport,
  };
}

const barRequest = (timeframe: '1h' | '1d' = '1d') => ({
  providerSymbol: 'THYAO.IS',
  timeframe,
  from: new Date('2026-07-24T00:00:00.000Z'),
  to: new Date('2026-07-25T00:00:00.000Z'),
});

describe('vendor market-data contract adapter', () => {
  it('1. maps instruments without exposing raw fields', async () => {
    const { provider } = adapter([response([instrumentFixture])]);
    const result = await provider.listInstruments();

    expect(result[0]).toMatchObject({
      providerSymbol: 'THYAO.IS',
      symbol: 'THYAO',
      listedAt: new Date('1990-01-01T00:00:00.000Z'),
    });
    expect(result[0]).not.toHaveProperty('rawPayload');
  });

  it('2. maps an unknown symbol to notFound', async () => {
    const { provider } = adapter([response({}, 404)]);
    await expect(provider.fetchBars(barRequest())).rejects.toMatchObject({
      taxonomy: 'notFound',
      retryable: false,
    });
  });

  it('3. preserves daily OHLCV decimal precision and lineage', async () => {
    const { provider } = adapter([response({ bars: [dailyBar] })]);
    const result = await provider.fetchBars(barRequest());

    expect(result.bars[0]).toMatchObject({
      open: dailyBar.open,
      close: dailyBar.close,
      volume: dailyBar.volume,
      providerRevision: 'rev-1',
    });
  });

  it('4. supports declared intraday OHLCV without timezone loss', async () => {
    const intraday = {
      ...dailyBar,
      timeframe: '1h',
      openTime: '2026-07-24T07:00:00.000Z',
      closeTime: '2026-07-24T08:00:00.000Z',
    };
    const { provider } = adapter([response({ bars: [intraday] })]);

    await expect(provider.fetchBars(barRequest('1h'))).resolves.toMatchObject({
      bars: [{ timeframe: '1h', openTime: new Date(intraday.openTime) }],
    });
  });

  it('5. preserves explicit timezone and ordered market session', async () => {
    const { provider } = adapter([
      response([
        {
          marketCode: 'BIST',
          sessionDate: '2026-07-24',
          timezone: 'Europe/Istanbul',
          opensAt: '2026-07-24T07:00:00.000Z',
          closesAt: '2026-07-24T15:00:00.000Z',
          status: 'open',
          sourceTimestamp: '2026-07-20T00:00:00.000Z',
          availableAt: '2026-07-20T00:00:01.000Z',
          revision: 'calendar-1',
        },
      ]),
    ]);

    await expect(
      provider.getTradingCalendar('BIST', '2026-07-24', '2026-07-24'),
    ).resolves.toMatchObject([
      {
        timezone: 'Europe/Istanbul',
        opensAt: new Date('2026-07-24T07:00:00.000Z'),
      },
    ]);
  });

  it('6. represents a trading holiday without a zero-length session', async () => {
    const { provider } = adapter([
      response([
        {
          marketCode: 'BIST',
          sessionDate: '2026-07-15',
          timezone: 'Europe/Istanbul',
          opensAt: null,
          closesAt: null,
          status: 'holiday',
          sourceTimestamp: '2026-07-01T00:00:00.000Z',
          availableAt: '2026-07-01T00:00:01.000Z',
          revision: 'calendar-1',
        },
      ]),
    ]);

    await expect(
      provider.getTradingCalendar('BIST', '2026-07-15', '2026-07-15'),
    ).resolves.toMatchObject([{ status: 'holiday', opensAt: null }]);
  });

  it('7. detects duplicate bars before persistence', async () => {
    const { provider } = adapter([response({ bars: [dailyBar, dailyBar] })]);
    const batch = await provider.fetchBars(barRequest());
    const validation = validateBars(
      batch.bars,
      {
        providerId: 'provider-id',
        instrumentId: 'instrument-id',
        listedAt: null,
        delistedAt: null,
        command: {
          providerCode: 'selected-vendor',
          ...barRequest(),
        },
      },
      new Date('2026-07-26T00:00:00.000Z'),
    );

    expect(validation.accepted).toHaveLength(1);
    expect(validation.rejected).toHaveLength(1);
    expect(validation.rejected[0]?.codes).toContain('DUPLICATE_BAR_IN_BATCH');
  });

  it('8. forwards an incremental cursor and bounded range', async () => {
    const { provider, transport } = adapter([response({ bars: [] })]);
    await provider.fetchBars({
      ...barRequest(),
      cursor: 'next-42',
      limit: 500,
    });

    expect(transport.requests[0]?.query).toMatchObject({
      cursor: 'next-42',
      limit: '500',
      from: '2026-07-24T00:00:00.000Z',
      to: '2026-07-25T00:00:00.000Z',
    });
  });

  it('9. keeps corrected bar revision evidence separate', async () => {
    const corrected = {
      ...dailyBar,
      close: '324.800000000000000001',
      providerRevision: 'rev-2',
    };
    const { provider } = adapter([
      response({ bars: [dailyBar] }),
      response({ bars: [corrected] }),
    ]);

    const first = await provider.fetchBars(barRequest());
    const second = await provider.fetchBars(barRequest());
    expect(first.bars[0]?.providerRevision).toBe('rev-1');
    expect(second.bars[0]?.providerRevision).toBe('rev-2');
    expect(second.bars[0]?.close).not.toBe(first.bars[0]?.close);
  });

  it('10. preserves listing and delisting metadata', async () => {
    const { provider } = adapter([
      response([
        {
          ...instrumentFixture,
          status: 'delisted',
          delistedAt: '2026-07-01T00:00:00.000Z',
        },
      ]),
    ]);

    const instruments = await provider.listInstruments();
    expect(instruments).toMatchObject([
      {
        status: 'delisted',
        listedAt: new Date('1990-01-01T00:00:00.000Z'),
        delistedAt: new Date('2026-07-01T00:00:00.000Z'),
      },
    ]);
    const imported = instruments[0];
    if (imported === undefined) throw new Error('Expected instrument fixture');
    const validation = validateBars(
      [
        {
          ...dailyBar,
          timeframe: '1d' as const,
          openTime: new Date('1989-12-31T07:00:00.000Z'),
          closeTime: new Date('1989-12-31T15:00:00.000Z'),
          sourceTimestamp: new Date(dailyBar.sourceTimestamp),
          availableAt: new Date(dailyBar.availableAt),
        },
        {
          ...dailyBar,
          timeframe: '1d' as const,
          openTime: new Date('2026-07-02T07:00:00.000Z'),
          closeTime: new Date('2026-07-02T15:00:00.000Z'),
          sourceTimestamp: new Date(dailyBar.sourceTimestamp),
          availableAt: new Date(dailyBar.availableAt),
        },
      ],
      {
        providerId: 'provider-id',
        instrumentId: 'instrument-id',
        listedAt: imported.listedAt?.toISOString().slice(0, 10) ?? null,
        delistedAt: imported.delistedAt?.toISOString().slice(0, 10) ?? null,
        command: {
          providerCode: 'selected-vendor',
          providerSymbol: 'THYAO.IS',
          timeframe: '1d',
          from: new Date('1980-01-01T00:00:00.000Z'),
          to: new Date('2030-01-01T00:00:00.000Z'),
        },
      },
      new Date('2030-01-02T00:00:00.000Z'),
    );
    expect(validation.rejected[0]?.codes).toContain('BAR_BEFORE_LISTING');
    expect(validation.rejected[1]?.codes).toContain('BAR_AFTER_DELISTING');
  });

  it('11. retains index membership effective dates', async () => {
    const { provider } = adapter([
      response([
        {
          kind: 'index',
          code: 'XU100',
          providerSymbol: 'THYAO.IS',
          effectiveFrom: '2026-01-01',
          effectiveTo: '2026-06-30',
          sourceTimestamp: '2025-12-20T00:00:00.000Z',
          availableAt: '2025-12-20T00:00:01.000Z',
          revision: 'membership-1',
        },
      ]),
    ]);

    await expect(provider.getMemberships()).resolves.toMatchObject([
      {
        kind: 'index',
        effectiveFrom: '2026-01-01',
        effectiveTo: '2026-06-30',
      },
    ]);
  });

  it('12. maps sector membership independently from index membership', async () => {
    const { provider } = adapter([
      response([
        {
          kind: 'sector',
          code: 'TRANSPORT',
          providerSymbol: 'THYAO.IS',
          effectiveFrom: '2020-01-01',
          effectiveTo: null,
          sourceTimestamp: '2020-01-01T00:00:00.000Z',
          availableAt: '2020-01-01T00:00:01.000Z',
          revision: 'sector-1',
        },
      ]),
    ]);

    await expect(provider.getMemberships('THYAO.IS')).resolves.toMatchObject([
      { kind: 'sector', code: 'TRANSPORT' },
    ]);
  });

  it('13. preserves benchmark adjustment and cutoff metadata', async () => {
    const { provider } = adapter([
      response([
        {
          benchmarkCode: 'XU100',
          openTime: '2026-07-24T07:00:00.000Z',
          closeTime: '2026-07-24T15:00:00.000Z',
          value: '10999.123456789012345678',
          adjustment: 'totalReturn',
          cutoffAt: '2026-07-24T15:00:00.000Z',
          sourceTimestamp: '2026-07-24T15:00:01.000Z',
          availableAt: '2026-07-24T15:00:02.000Z',
          revision: 'benchmark-1',
        },
      ]),
    ]);

    await expect(
      provider.getBenchmarkSeries(
        'XU100',
        new Date('2026-07-24T00:00:00.000Z'),
        new Date('2026-07-25T00:00:00.000Z'),
      ),
    ).resolves.toMatchObject([
      {
        adjustment: 'totalReturn',
        cutoffAt: new Date('2026-07-24T15:00:00.000Z'),
      },
    ]);
  });

  it('14. honors retry-after and captures rate-limit state', async () => {
    const { provider, transport } = adapter([
      response({}, 429, {
        'retry-after': '0',
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '0',
      }),
      response({ bars: [] }, 200, {
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '99',
      }),
    ]);

    await provider.fetchBars(barRequest());
    expect(transport.requests).toHaveLength(2);
    expect(provider.getRateLimitState()).toMatchObject({
      limit: 100,
      remaining: 99,
    });
  });

  it('15. retries a timeout with bounded attempts', async () => {
    const timeout = new Error('upstream timed out');
    timeout.name = 'TimeoutError';
    const { provider, transport } = adapter([timeout, response({ bars: [] })]);

    await expect(provider.fetchBars(barRequest())).resolves.toEqual({
      bars: [],
    });
    expect(transport.requests).toHaveLength(2);
  });

  it('16. rejects invalid payloads without retrying', async () => {
    const { provider, transport } = adapter([
      response({ bars: [{ ...dailyBar, close: null }] }),
    ]);

    await expect(provider.fetchBars(barRequest())).rejects.toMatchObject({
      taxonomy: 'invalidPayload',
      retryable: false,
    });
    expect(transport.requests).toHaveLength(1);
  });

  it('17. reports provider outage through health degradation', async () => {
    const { provider } = adapter([response({}, 503), response({}, 503)]);

    await expect(provider.getHealth()).resolves.toMatchObject({
      status: 'unavailable',
      reason: 'providerOutage',
    });
  });

  it('18. never includes a credential or upstream body in errors', async () => {
    const secret = 'secret-value-never-log';
    const { provider } = adapter([response({ token: secret }, 401)], secret);

    let error: unknown;
    try {
      await provider.fetchBars(barRequest());
    } catch (caught: unknown) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ProviderContractError);
    expect(JSON.stringify(error)).not.toContain(secret);
    if (!(error instanceof Error)) throw new Error('Expected provider error');
    expect(error.message).toBe('Provider authentication failed');
  });

  it('19. replays a frozen contract fixture deterministically', async () => {
    const fixture = Object.freeze({
      bars: [Object.freeze({ ...dailyBar })],
      nextCursor: 'cursor-2',
    });
    const first = adapter([response(fixture)]).provider;
    const second = adapter([response(fixture)]).provider;

    expect(await first.fetchBars(barRequest())).toEqual(
      await second.fetchBars(barRequest()),
    );
  });
});
