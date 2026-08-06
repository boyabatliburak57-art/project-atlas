import { describe, expect, it } from 'vitest';
import { gateDeepLink, parseDeepLink } from './deep-links';
import { resolveGuard } from './route-guard';

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
});
