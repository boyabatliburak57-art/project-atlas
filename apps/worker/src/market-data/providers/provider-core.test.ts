import { describe, expect, it } from 'vitest';

import { ProviderContractError, retryPolicyForProviderError } from './errors';
import {
  executeWithProviderFallback,
  ProviderContractRegistry,
  redactProviderConnection,
  type ProviderCapability,
  type ProviderConnection,
  type ProviderHealth,
  type ProviderLicenseMetadata,
  type ProviderLineage,
  type ProviderRegistration,
} from './provider-core';
import { ProviderRegistry } from './provider-registry';
import { FakeMarketDataProviderAdapter } from './testing/fake-market-data-provider';

const healthy = (): Promise<ProviderHealth> =>
  Promise.resolve({
    status: 'healthy',
    checkedAt: new Date('2026-07-26T08:00:00.000Z'),
    reason: 'none',
  });

const license: ProviderLicenseMetadata = {
  licenseId: 'licensed-feed-v1',
  attribution: 'Licensed provider',
  redistribution: 'derivedDataOnly',
};

function connection(code: string): ProviderConnection {
  return {
    providerCode: code,
    environment: 'production',
    credential: {
      store: 'secretStore',
      reference: `providers/${code}`,
      version: 'current',
    },
  };
}

function registration(
  code: string,
  supported: readonly ProviderCapability[],
  overrides: Partial<ProviderRegistration> = {},
): ProviderRegistration {
  return {
    code,
    priority: 10,
    connection: connection(code),
    capabilities: { supported },
    license,
    health: healthy,
    ...overrides,
  };
}

const fallbackPolicy = {
  retryOn: ['timeout', 'network', 'temporaryUnavailable'] as const,
  allowDegraded: false,
};

describe('provider-neutral contracts', () => {
  it('1. registers and resolves provider contracts without an SDK dependency', () => {
    const registry = new ProviderRegistry();
    registry.registerContract(registration('provider-b', ['ohlcv']));
    registry.registerContract(registration('provider-a', ['instruments']));

    expect(registry.listContractCodes()).toEqual(['provider-a', 'provider-b']);
    expect(registry.discoverCapabilities('provider-a')).toEqual({
      supported: ['instruments'],
    });
  });

  it('2. discovers normalized capabilities in canonical order', () => {
    const registry = new ProviderContractRegistry();
    registry.register(
      registration('provider-a', [
        'corporateActions',
        'ohlcv',
        'instruments',
        'ohlcv',
      ]),
    );

    expect(registry.discover('provider-a')).toEqual({
      supported: ['instruments', 'ohlcv', 'corporateActions'],
    });
  });

  it('3. rejects unsupported capabilities with the standard taxonomy', async () => {
    const registry = new ProviderContractRegistry();
    registry.register(registration('provider-a', ['instruments']));

    await expect(
      registry.select('fundamentals', fallbackPolicy),
    ).rejects.toMatchObject({
      taxonomy: 'unsupportedCapability',
      retryable: false,
    });
  });

  it('4. treats authentication failures as non-retryable and safe', () => {
    const error = new ProviderContractError(
      'authentication',
      { providerCode: 'provider-a' },
      { cause: new Error('Bearer raw-secret') },
    );

    expect(retryPolicyForProviderError(error)).toEqual({
      retryable: false,
      retryAfterMs: null,
    });
    expect(error.message).toBe('Provider authentication failed');
    expect(error.message).not.toContain('raw-secret');
  });

  it('5. preserves rate-limit retry-after without changing taxonomy', () => {
    const error = new ProviderContractError('rateLimit', {
      retryAfterMs: 12_000,
    });

    expect(retryPolicyForProviderError(error)).toEqual({
      retryable: true,
      retryAfterMs: 12_000,
    });
  });

  it('6. treats timeout failures as retryable', () => {
    expect(
      retryPolicyForProviderError(new ProviderContractError('timeout')),
    ).toEqual({ retryable: true, retryAfterMs: null });
  });

  it('7. treats invalid provider payloads as non-retryable', () => {
    expect(
      retryPolicyForProviderError(new ProviderContractError('invalidPayload')),
    ).toEqual({ retryable: false, retryAfterMs: null });
  });

  it('8. redacts credential references from operational output', () => {
    const providerConnection = connection('provider-a');

    const serialized = JSON.stringify(
      redactProviderConnection(providerConnection),
    );
    expect(serialized).toContain('[REDACTED]');
    expect(serialized).not.toContain('providers/provider-a');
    expect(serialized).not.toContain('current');
  });

  it('9. preserves revision metadata independently from source time', () => {
    const lineage: ProviderLineage = {
      providerCode: 'provider-a',
      revision: 'rev-42',
      revisedAt: new Date('2026-07-26T09:00:00.000Z'),
      supersedesRevision: 'rev-41',
      sourceTimestamp: new Date('2026-07-25T16:00:00.000Z'),
      availableAt: new Date('2026-07-26T08:30:00.000Z'),
      license,
    };

    expect(lineage.revision).toBe('rev-42');
    expect(lineage.sourceTimestamp).not.toEqual(lineage.revisedAt);
  });

  it('10. keeps available-at distinct from provider source timestamp', () => {
    const metadata = {
      sourceTimestamp: new Date('2026-07-25T16:00:00.000Z'),
      availableAt: new Date('2026-07-26T06:00:00.000Z'),
    };

    expect(metadata.availableAt.getTime()).toBeGreaterThan(
      metadata.sourceTimestamp.getTime(),
    );
  });

  it('11. retains license and redistribution metadata in selection', async () => {
    const registry = new ProviderContractRegistry();
    registry.register(registration('provider-a', ['benchmarks']));

    await expect(
      registry.select('benchmarks', fallbackPolicy),
    ).resolves.toMatchObject({
      code: 'provider-a',
      license: {
        licenseId: 'licensed-feed-v1',
        redistribution: 'derivedDataOnly',
      },
    });
  });

  it('12. falls back on eligible errors and retains the selected source', async () => {
    const registry = new ProviderContractRegistry();
    registry.register(
      registration('primary', ['ohlcv'], {
        priority: 1,
      }),
    );
    registry.register(
      registration('secondary', ['ohlcv'], {
        priority: 2,
      }),
    );

    const result = await executeWithProviderFallback(
      registry,
      'ohlcv',
      fallbackPolicy,
      (selected) =>
        selected.code === 'primary'
          ? Promise.reject(new ProviderContractError('timeout'))
          : Promise.resolve({ normalizedClose: '42.10' }),
    );

    expect(result).toEqual({
      providerCode: 'secondary',
      value: { normalizedClose: '42.10' },
    });
  });

  it('13. excludes degraded providers unless policy permits them', async () => {
    const registry = new ProviderContractRegistry();
    registry.register(
      registration('degraded-provider', ['fundamentals'], {
        priority: 1,
        health: () =>
          Promise.resolve({
            status: 'degraded',
            checkedAt: new Date('2026-07-26T08:00:00.000Z'),
            reason: 'latency',
          }),
      }),
    );
    registry.register(
      registration('healthy-provider', ['fundamentals'], { priority: 2 }),
    );

    await expect(
      registry.select('fundamentals', fallbackPolicy),
    ).resolves.toMatchObject({ code: 'healthy-provider' });
  });

  it('14. rejects raw provider fields at the normalization boundary', async () => {
    const adapter = new FakeMarketDataProviderAdapter({
      capabilities: {
        supportedTimeframes: ['1d'],
        dataMode: 'end-of-day',
        historicalDepthDays: 30,
        supportsCorporateActions: false,
        supportsFundamentals: false,
        supportsPagination: false,
        rateLimit: null,
      },
      instruments: [
        {
          providerSymbol: 'ATLAS',
          symbol: 'ATLAS',
          name: 'Atlas',
          marketCode: 'BIST',
          currencyCode: 'TRY',
          rawPayload: { accessToken: 'must-not-cross-boundary' },
        },
      ],
      barBatch: { bars: [] },
    });

    await expect(
      new ProviderRegistry().register(adapter).listInstruments(),
    ).rejects.toMatchObject({
      code: 'PROVIDER_MALFORMED_RESPONSE',
      retryable: false,
    });
  });

  it('15. selects deterministically by policy, priority, then provider code', async () => {
    const registry = new ProviderContractRegistry();
    registry.register(
      registration('provider-z', ['tradingCalendar'], { priority: 5 }),
    );
    registry.register(
      registration('provider-b', ['tradingCalendar'], { priority: 1 }),
    );
    registry.register(
      registration('provider-a', ['tradingCalendar'], { priority: 1 }),
    );

    await expect(
      registry.select('tradingCalendar', fallbackPolicy),
    ).resolves.toMatchObject({ code: 'provider-a' });
    await expect(
      registry.select('tradingCalendar', {
        ...fallbackPolicy,
        orderedProviderCodes: ['provider-z'],
      }),
    ).resolves.toMatchObject({ code: 'provider-z' });
  });
});
