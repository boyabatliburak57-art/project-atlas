import { describe, expect, it, vi } from 'vitest';
import {
  AtlasApiClient,
  AtlasApiError,
  mapApiError,
  shouldRetryRequest,
} from './client';

const credentials = {
  getToken: vi.fn(() => Promise.resolve('session-secret')),
  onUnauthorized: vi.fn(() => Promise.resolve()),
};

function client(fetchImplementation: typeof fetch) {
  return new AtlasApiClient({
    baseUrl: 'https://api.atlas.test/api/v1',
    context: () => ({
      appVersion: '1.0.0',
      locale: 'tr-TR',
      platform: 'ios',
      timezone: 'Europe/Istanbul',
    }),
    credentials,
    fetch: fetchImplementation,
    requestId: () => 'request-1',
  });
}

describe('AtlasApiClient', () => {
  it('adds correlation, client, locale and timezone headers without logging secrets', async () => {
    const mockFetch = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: { ok: true }, meta: {} }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    await client(mockFetch).request({ path: '/health' });
    const headers = new Headers(mockFetch.mock.calls[0]?.[1]?.headers);
    expect(headers.get('X-Request-ID')).toBe('request-1');
    expect(headers.get('X-Atlas-Locale')).toBe('tr-TR');
    expect(headers.get('X-Atlas-Timezone')).toBe('Europe/Istanbul');
    expect(headers.get('Authorization')).toBe('Bearer session-secret');
  });

  it('sends an explicit idempotency key without allowing arbitrary header overrides', async () => {
    const mockFetch = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response(null, { status: 204 })),
    );
    await client(mockFetch).request({
      idempotencyKey: 'mobile-mutation-0001',
      method: 'POST',
      path: '/mutations',
    });
    const headers = new Headers(mockFetch.mock.calls[0]?.[1]?.headers);
    expect(headers.get('Idempotency-Key')).toBe('mobile-mutation-0001');
    expect(headers.get('Authorization')).toBe('Bearer session-secret');
  });

  it('maps unsafe internal errors to a bounded safe contract', async () => {
    const error = await mapApiError(
      new Response(
        JSON.stringify({ code: 'INVALID', message: 'Safe explanation' }),
        {
          status: 400,
          headers: { 'x-request-id': 'server-request' },
        },
      ),
    );
    expect(error).toMatchObject({
      code: 'INVALID',
      requestId: 'server-request',
      safeMessage: 'Safe explanation',
      status: 400,
    });
  });

  it('notifies unauthorized handling and preserves typed errors', async () => {
    credentials.onUnauthorized.mockClear();
    const mockFetch = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ code: 'AUTHENTICATION_REQUIRED' }), {
          status: 401,
        }),
      ),
    );
    await expect(
      client(mockFetch).request({ path: '/me' }),
    ).rejects.toBeInstanceOf(AtlasApiError);
    expect(credentials.onUnauthorized).toHaveBeenCalled();
  });

  it('does not attach or expire a session for anonymous endpoint failures', async () => {
    credentials.onUnauthorized.mockClear();
    const mockFetch = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ code: 'AUTHENTICATION_FAILED' }), {
          status: 401,
        }),
      ),
    );
    await expect(
      client(mockFetch).request({
        authentication: 'anonymous',
        method: 'POST',
        path: '/auth/login',
      }),
    ).rejects.toBeInstanceOf(AtlasApiError);
    const headers = new Headers(mockFetch.mock.calls[0]?.[1]?.headers);
    expect(headers.get('Authorization')).toBeNull();
    expect(credentials.onUnauthorized).not.toHaveBeenCalled();
  });

  it('cancels linked requests', async () => {
    const controller = new AbortController();
    const mockFetch = vi.fn<typeof fetch>((_input, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new Error('aborted')),
        );
      });
    });
    const pending = client(mockFetch).request({
      path: '/slow',
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'REQUEST_CANCELLED' });
  });

  it('uses a bounded retry taxonomy', () => {
    const retryable = new AtlasApiError({
      status: 503,
      code: 'UNAVAILABLE',
      safeMessage: 'Unavailable',
      fieldErrors: {},
      retryable: true,
    });
    expect(shouldRetryRequest(0, retryable)).toBe(true);
    expect(shouldRetryRequest(2, retryable)).toBe(false);
    expect(shouldRetryRequest(0, new Error('unknown'))).toBe(false);
  });
});
