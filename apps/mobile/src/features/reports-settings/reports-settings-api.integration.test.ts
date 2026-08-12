import { AtlasApiClient } from '@atlas/api-client';
import { describe, expect, it, vi } from 'vitest';

import { ReportsSettingsApi } from './reports-settings-api';

function api(fetch: typeof globalThis.fetch) {
  return new ReportsSettingsApi(
    new AtlasApiClient({
      baseUrl: 'https://api.example.test/api/v1',
      context: () => ({
        appVersion: '1',
        locale: 'tr-TR',
        platform: 'ios',
        timezone: 'Europe/Istanbul',
      }),
      credentials: {
        getToken: () => Promise.resolve('session-token'),
        onUnauthorized: () => Promise.resolve(),
      },
      fetch,
      requestId: () => 'mobile-task-100i',
    }),
  );
}

function requestUrl(input: Parameters<typeof globalThis.fetch>[0]): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

describe('TASK-100I typed API mapping', () => {
  it('maps owner-scoped report creation without putting data in query', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'r1', status: 'queued' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await api(fetch).createReport({
      reportType: 'portfolio',
      sourceId: '00000000-0000-4000-8000-000000000001',
      format: 'pdf',
      idempotencyKey: 'mobile-report-00000001',
    });
    const [url, init] = fetch.mock.calls[0]!;
    expect(requestUrl(url)).toBe('https://api.example.test/api/v1/reports');
    expect(init?.body).toContain('"format":"pdf"');
    expect(init?.headers).toMatchObject({
      Authorization: 'Bearer session-token',
    });
  });

  it('maps bounded report/support cursor requests', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ data: { items: [], nextCursor: null } }),
            { status: 200 },
          ),
        ),
      );
    const client = api(fetch);
    await client.listReports('opaque-report-cursor');
    await client.listSupportRequests('opaque-support-cursor');
    expect(requestUrl(fetch.mock.calls[0]![0])).toContain('limit=20');
    expect(requestUrl(fetch.mock.calls[1]![0])).toContain('limit=20');
  });

  it('keeps expectedVersion in the settings mutation body', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: { version: 9 } }), { status: 200 }),
      );
    await api(fetch).updatePreferences({ expectedVersion: 8, theme: 'dark' });
    expect(fetch.mock.calls[0]?.[1]?.body).toContain('"expectedVersion":8');
  });
});
