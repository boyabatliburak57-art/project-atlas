import { describe, expect, it } from 'vitest';
import { FeatureFlagController, safeCapabilityDefaults } from './feature-flags';

describe('feature flags', () => {
  it('fails closed before backend bootstrap', () => {
    expect(
      Object.values(safeCapabilityDefaults()).every((value) => !value.enabled),
    ).toBe(true);
  });

  it('bootstraps versioned backend values without enabling absent capabilities', () => {
    const controller = new FeatureFlagController();
    const result = controller.bootstrap({
      mobileHome: { enabled: true, reasonCode: 'AVAILABLE', version: 2 },
    });
    expect(result.mobileHome.enabled).toBe(true);
    expect(result.newsInsights.enabled).toBe(false);
  });
});
