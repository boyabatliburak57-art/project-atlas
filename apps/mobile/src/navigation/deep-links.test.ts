import { describe, expect, it, vi } from 'vitest';
import {
  consumeTokenDeepLink,
  gateDeepLink,
  parseDeepLink,
  resolveStaticRouteAlias,
} from './deep-links';
import { resolveGuard } from './route-guard';
import { ownershipPath, resourcePath } from './resource-routes';

describe('deep links and guards', () => {
  it('accepts allowlisted links and rejects arbitrary URLs', () => {
    expect(parseDeepLink('atlas://symbol/THYAO')).toEqual({
      kind: 'symbol',
      id: 'THYAO',
    });
    expect(parseDeepLink('https://evil.test/admin')).toBeNull();
    expect(parseDeepLink('atlas://unknown/value')).toBeNull();
    expect(parseDeepLink('foreign://symbol/THYAO')).toBeNull();
    expect(parseDeepLink('atlas://symbol/thyao')).toBeNull();
    expect(parseDeepLink('atlas://symbol/THYAO/extra')).toBeNull();
  });

  it('validates every owned-resource identifier', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    expect(parseDeepLink(`atlas://alert/${id}`)).toEqual({
      kind: 'alert',
      id,
    });
    expect(parseDeepLink(`atlas://scan-result/${id}`)).toEqual({
      kind: 'scan-result',
      id,
    });
    expect(parseDeepLink(`atlas://event/${id}`)).toEqual({ kind: 'event', id });
    expect(parseDeepLink(`atlas://institution/${id}`)).toEqual({
      kind: 'institution',
      id,
    });
    expect(
      parseDeepLink(`atlas://institution/${id}?provider=vendor`),
    ).toBeNull();
    expect(parseDeepLink('atlas://report/not-a-uuid')).toBeNull();
  });

  it('auth-gates a valid target', () => {
    const target = parseDeepLink('atlas://symbol/THYAO');
    expect(target).not.toBeNull();
    expect(
      gateDeepLink(target!, {
        authenticated: false,
        onboardingComplete: false,
      }),
    ).toMatchObject({
      destination: 'auth',
    });
  });

  it('accepts completed owner resources and rejects params or oversized links', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    expect(parseDeepLink(`atlas://strategy/${id}`)).toEqual({
      kind: 'strategy',
      id,
    });
    expect(parseDeepLink(`atlas://support/${id}?owner=other`)).toBeNull();
    expect(parseDeepLink(`atlas://symbol/${'A'.repeat(800)}`)).toBeNull();
  });

  it('consumes bounded auth tokens without returning or persisting them', () => {
    const consume = vi.fn();
    const token = 'x'.repeat(16);
    expect(consumeTokenDeepLink(`atlas://reset/${token}`, consume)).toBe(true);
    expect(consume).toHaveBeenCalledWith({ kind: 'reset', token });
    expect(consumeTokenDeepLink(`atlas://reset/${token}?copy=1`, consume)).toBe(
      false,
    );
  });

  it('routes authentication and onboarding states', () => {
    expect(
      resolveGuard({
        auth: { status: 'unauthenticated' },
        onboardingComplete: false,
        requestedAdmin: false,
      }),
    ).toBe('/(auth)');
    expect(
      resolveGuard({
        auth: {
          status: 'authenticated',
          session: {
            expiresAt: '2099-01-01T00:00:00.000Z',
            roles: [],
            token: 'not-in-navigation',
            userId: 'user',
          },
        },
        onboardingComplete: false,
        requestedAdmin: false,
      }),
    ).toBe('/(onboarding)');
    expect(
      resolveGuard({
        auth: {
          status: 'verificationRequired',
          session: {
            emailVerificationRequired: true,
            expiresAt: '2099-01-01T00:00:00.000Z',
            roles: [],
            token: 'not-in-navigation',
            userId: 'user',
          },
        },
        onboardingComplete: false,
        requestedAdmin: false,
      }),
    ).toBe('/(auth)/verification');
  });

  it('migrates legacy static routes to one canonical V2 owner', () => {
    expect(resolveStaticRouteAlias('atlas://scanner')).toBe('/radar/scanner');
    expect(resolveStaticRouteAlias('atlas://watchlists/')).toBe(
      '/radar/watchlists',
    );
    expect(resolveStaticRouteAlias('atlas://reports')).toBe(
      '/research/reports',
    );
    expect(resolveStaticRouteAlias('atlas://events')).toBe('/research/events');
    expect(resolveStaticRouteAlias('atlas://settings')).toBe('/settings');
    expect(resolveStaticRouteAlias('atlas:///markets/overview')).toBe(
      '/markets/overview',
    );
    expect(resolveStaticRouteAlias('atlas:///research/backtests')).toBe(
      '/research/backtests',
    );
    expect(resolveStaticRouteAlias('atlas:///login')).toBe('/login');
    expect(resolveStaticRouteAlias('atlas://scanner?owner=other')).toBeNull();
  });

  it('keeps server ownership checks while resolving canonical resource routes', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    expect(resourcePath({ kind: 'alert', id })).toBe(
      `/radar/alerts?resourceId=${id}`,
    );
    expect(ownershipPath({ kind: 'alert', id })).toBe(`/alerts/${id}`);
    expect(resourcePath({ kind: 'backtest', id })).toBe(
      `/research/backtests?resourceId=${id}`,
    );
    expect(ownershipPath({ kind: 'backtest', id })).toBe(`/backtests/${id}`);
    expect(resourcePath({ kind: 'event', id })).toBe(`/research/events/${id}`);
    expect(ownershipPath({ kind: 'event', id })).toBeNull();
    expect(resourcePath({ kind: 'institution', id })).toBe(
      `/markets/institutional/institutions/${id}`,
    );
    expect(ownershipPath({ kind: 'institution', id })).toBeNull();
  });
});
