import { describe, expect, it } from 'vitest';

import {
  IntelligenceProviderRegistry,
  intelligenceMetricLabels,
} from './provider-foundation';

describe('intelligence provider composition foundation', () => {
  it('fails closed without configured supported adapter', () => {
    const registry = new IntelligenceProviderRegistry();
    expect(() =>
      registry.register({
        providerId: 'vendor',
        capability: 'disclosure.kap',
        availability: 'SUPPORTED_LIVE',
        health: () => Promise.resolve('HEALTHY'),
        credentialReference: null,
        adapter: null,
      }),
    ).toThrowError('EXTERNAL_CONFIGURATION_REQUIRED');
  });
  it('records provider-required state without fake adapter', () => {
    const registry = new IntelligenceProviderRegistry();
    registry.register({
      providerId: 'unconfigured',
      capability: 'institutional.akd',
      availability: 'PROVIDER_REQUIRED',
      health: () => Promise.resolve('UNAVAILABLE'),
      credentialReference: null,
      adapter: null,
    });
    expect(
      registry.resolve('unconfigured', 'institutional.akd').availability,
    ).toBe('PROVIDER_REQUIRED');
  });
  it('uses bounded observability labels', () =>
    expect(
      Object.keys(
        intelligenceMetricLabels({
          providerId: 'vendor',
          capability: 'settlement.snapshot',
          outcome: 'success',
        }),
      ),
    ).toEqual(['provider', 'capability', 'outcome']));
});
