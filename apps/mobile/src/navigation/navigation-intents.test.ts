import { describe, expect, it } from 'vitest';
import {
  allowedNavigationAnalytics,
  resolveNavigationIntent,
  safeNavigationAnalyticsProperties,
} from './navigation-intents';

describe('typed cross-module navigation intents', () => {
  const id = '123e4567-e89b-12d3-a456-426614174000';

  it('resolves existing resources to canonical V2 routes', () => {
    expect(
      resolveNavigationIntent({ kind: 'OpenSymbol', symbol: 'THYAO' }),
    ).toMatchObject({
      route: '/symbol/THYAO',
      ownershipRequirement: 'NONE',
    });
    expect(
      resolveNavigationIntent({ kind: 'OpenScanner', runId: id }),
    ).toMatchObject({
      route: `/radar/scanner?runId=${id}`,
      ownershipRequirement: 'SERVER_REVALIDATION',
    });
    expect(resolveNavigationIntent({ kind: 'OpenReport', id })).toMatchObject({
      route: `/research/reports?resourceId=${id}`,
      ownershipRequirement: 'SERVER_REVALIDATION',
    });
  });

  it('rejects malformed and unbounded payloads', () => {
    expect(
      resolveNavigationIntent({ kind: 'OpenSymbol', symbol: '../../admin' }),
    ).toBeNull();
    expect(
      resolveNavigationIntent({ kind: 'OpenCompare', ids: ['THYAO'] }),
    ).toBeNull();
    expect(
      resolveNavigationIntent({ kind: 'OpenInstitution', id: 'not-owned' }),
    ).toBeNull();
  });

  it('keeps navigation analytics content-free', () => {
    expect(allowedNavigationAnalytics).toContain('contextual_navigation_used');
    expect(
      safeNavigationAnalyticsProperties({
        hub: 'radar',
        intentKind: 'OpenScanner',
      }),
    ).toEqual({ hub: 'radar', intentKind: 'OpenScanner' });
  });
});
