import { describe, expect, it, vi } from 'vitest';
import { AtlasApiClient } from '@atlas/api-client';
import { MobileAuthApi } from './auth-api';
import { MobilePreferencesApi } from '../preferences/preferences-api';

function client(fetch: typeof globalThis.fetch) {
  return new AtlasApiClient({
    baseUrl: 'https://api.atlas.test/api/v1',
    context: () => ({
      appVersion: '0.1.0',
      locale: 'tr-TR',
      platform: 'ios',
      timezone: 'Europe/Istanbul',
    }),
    credentials: {
      getToken: () => Promise.resolve(null),
      onUnauthorized: () => Promise.resolve(),
    },
    fetch,
    requestId: () => 'mobile-auth-request',
  });
}

function firstRequestBody(
  fetch: ReturnType<typeof vi.fn<typeof globalThis.fetch>>,
  index = 0,
) {
  const body = fetch.mock.calls[index]?.[1]?.body;
  if (typeof body !== 'string') throw new Error('Expected a JSON request body');
  return JSON.parse(body) as unknown;
}

describe('typed mobile auth/onboarding API', () => {
  it('maps mobile login response into a secure session credential', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            data: {
              emailVerificationRequired: true,
              expiresAt: '2099-01-01T00:00:00.000Z',
              roles: ['user'],
              sessionToken: 'opaque-token',
              userId: 'user-1',
            },
            meta: {},
          }),
          { status: 200 },
        ),
      ),
    );
    const session = await new MobileAuthApi(client(fetch)).login(
      ' USER@example.com ',
      ' password ',
    );
    expect(session.token).toBe('opaque-token');
    expect(session.emailVerificationRequired).toBe(true);
    expect(firstRequestBody(fetch)).toEqual({
      email: 'user@example.com',
      password: ' password ',
    });
  });

  it('uses typed verification status, resend and token confirmation contracts', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              deliveryMode: 'SANDBOX_INTEGRATION',
              maskedEmail: 'u***@example.test',
              reasonCode: 'EMAIL_VERIFICATION_REQUIRED',
              resendAvailableAt: null,
              verified: false,
              verifiedAt: null,
            },
            meta: {},
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              accepted: true,
              resendAvailableAt: '2026-07-31T17:15:00.000Z',
            },
            meta: {},
          }),
          { status: 202 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { alreadyVerified: false, verified: true },
            meta: {},
          }),
          { status: 200 },
        ),
      );
    const api = new MobileAuthApi(client(fetch));
    expect((await api.verificationStatus()).data.maskedEmail).toBe(
      'u***@example.test',
    );
    await api.resendVerification();
    await api.confirmVerification('v'.repeat(43));
    expect(firstRequestBody(fetch, 2)).toEqual({ token: 'v'.repeat(43) });
  });

  it('uses enumeration-safe reset requests', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: { accepted: true }, meta: {} }), {
          status: 202,
        }),
      ),
    );
    await new MobileAuthApi(client(fetch)).requestPasswordReset(
      'missing@example.com',
    );
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('sends onboarding completion with expectedVersion', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: { version: 3 }, meta: {} }), {
          status: 200,
        }),
      ),
    );
    await new MobilePreferencesApi(client(fetch)).completeOnboarding(2, false);
    expect(firstRequestBody(fetch)).toEqual({
      demoDataRequested: false,
      expectedVersion: 2,
    });
  });

  it('preserves preference conflicts instead of silently overwriting', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            code: 'PREFERENCES_VERSION_CONFLICT',
            safeMessage: 'Preferences changed',
          }),
          { status: 409 },
        ),
      ),
    );
    await expect(
      new MobilePreferencesApi(client(fetch)).update(1, {
        timezone: 'Europe/Istanbul',
      }),
    ).rejects.toMatchObject({
      code: 'PREFERENCES_VERSION_CONFLICT',
      status: 409,
    });
  });
});
