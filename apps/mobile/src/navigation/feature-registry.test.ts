import { describe, expect, it } from 'vitest';
import {
  atlasFeatureRegistry,
  customerFeaturesForHub,
  developmentFeatureCatalog,
  duplicateCanonicalOwners,
  primaryNavigation,
} from './feature-registry';

describe('Atlas navigation V2 registry', () => {
  it('owns exactly five primary tabs in the approved order', () => {
    expect(primaryNavigation.map((item) => item.label)).toEqual([
      'Home',
      'Markets',
      'Radar',
      'Portfolio',
      'Research',
    ]);
    expect(primaryNavigation).toHaveLength(5);
    expect(primaryNavigation.map((item) => item.label)).not.toContain('Search');
    expect(primaryNavigation.map((item) => item.label)).not.toContain('More');
  });

  it('has one canonical owner per navigation item', () => {
    expect(duplicateCanonicalOwners()).toEqual([]);
    expect(new Set(atlasFeatureRegistry.map((item) => item.id)).size).toBe(
      atlasFeatureRegistry.length,
    );
  });

  it('publishes implemented gated surfaces while keeping future features hidden', () => {
    expect(customerFeaturesForHub('markets').map((item) => item.id)).toContain(
      'institutional',
    );
    expect(customerFeaturesForHub('markets').map((item) => item.id)).toContain(
      'market-structure',
    );
    expect(
      developmentFeatureCatalog().find((item) => item.id === 'institutional')
        ?.visibility,
    ).toBe('CUSTOMER');
    expect(
      customerFeaturesForHub('research').map((item) => item.id),
    ).not.toContain('company-research');
    expect(customerFeaturesForHub('research').map((item) => item.id)).toContain(
      'events-calendar',
    );
  });

  it('keeps each customer hub within the first-viewport disclosure limit', () => {
    for (const hub of ['markets', 'radar', 'portfolio', 'research'] as const)
      expect(customerFeaturesForHub(hub).length).toBeLessThanOrEqual(7);
  });
});
