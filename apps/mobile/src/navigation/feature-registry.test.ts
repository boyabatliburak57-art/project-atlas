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

  it('keeps future provider and license features out of customer hubs', () => {
    expect(
      developmentFeatureCatalog().some(
        (item) =>
          item.id === 'institutional' && item.visibility === 'CAPABILITY_GATED',
      ),
    ).toBe(true);
    expect(
      customerFeaturesForHub('markets').map((item) => item.id),
    ).not.toContain('institutional');
    expect(
      customerFeaturesForHub('research').map((item) => item.id),
    ).not.toContain('company-research');
  });

  it('keeps each customer hub within the first-viewport disclosure limit', () => {
    for (const hub of ['markets', 'radar', 'portfolio', 'research'] as const)
      expect(customerFeaturesForHub(hub).length).toBeLessThanOrEqual(7);
  });
});
