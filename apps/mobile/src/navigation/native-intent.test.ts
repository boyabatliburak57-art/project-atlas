import { describe, expect, it } from 'vitest';
import { redirectSystemPath } from '../../app/+native-intent';

describe('cold-launch V2 route migration', () => {
  it('normalizes legacy static links before Expo Router resolution', () => {
    expect(redirectSystemPath({ path: 'atlas://scanner', initial: true })).toBe(
      '/radar/scanner',
    );
    expect(redirectSystemPath({ path: 'atlas://reports', initial: true })).toBe(
      '/research/reports',
    );
    expect(
      redirectSystemPath({ path: 'atlas://notifications', initial: true }),
    ).toBe('/inbox');
    expect(
      redirectSystemPath({ path: 'atlas:///portfolio/risk', initial: true }),
    ).toBe('/portfolio/risk');
  });

  it('does not allow alias query parameters or malformed symbols', () => {
    expect(
      redirectSystemPath({
        path: 'atlas://scanner?owner=other',
        initial: true,
      }),
    ).toBe('atlas://scanner?owner=other');
    expect(
      redirectSystemPath({ path: 'atlas://symbol/thyao', initial: true }),
    ).toBe('/+not-found');
  });
});
