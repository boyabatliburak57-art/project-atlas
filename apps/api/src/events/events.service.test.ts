import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';

import type { MarketRateLimiter } from '../market/market-overview.ports';
import type { EventFeedRow, EventReader } from './events.ports';
import { EventsService } from './events.service';

describe('KAP feed application contract', () => {
  it('uses signed cursor pagination, deterministic newest-first query and bounded pages', async () => {
    const rows = Array.from({ length: 3 }, (_, index) =>
      row({ revisionId: `30000000-0000-4000-a000-00000000000${index + 1}` }),
    );
    const { service, reader } = setup(rows);
    const first = await service.feed('user-1', 'client-1', { limit: 2 });
    expect(first.data.items).toHaveLength(2);
    expect(typeof first.meta.nextCursor).toBe('string');
    expect(reader.feed).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 3, cursor: null }),
    );
    await service.feed('user-1', 'client-1', {
      limit: 2,
      cursor: first.meta.nextCursor,
    });
    expect(reader.feed).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cursor: expect.objectContaining({
          revisionId: rows[1]!.revisionId,
        }) as unknown,
      }),
    );
  });

  it('binds the cursor to user and filters', async () => {
    const { service } = setup([
      row(),
      row({ revisionId: '30000000-0000-4000-a000-000000000002' }),
    ]);
    const first = await service.feed('user-1', 'client-1', {
      category: 'DIVIDEND',
      limit: 1,
    });
    await expect(
      service.feed('user-2', 'client-1', {
        category: 'DIVIDEND',
        limit: 1,
        cursor: first.meta.nextCursor!,
      }),
    ).rejects.toThrow();
  });

  it('rejects unbounded date ranges, oversized search, invalid taxonomy and provider input', async () => {
    const { service } = setup([]);
    await expect(
      service.feed('user', 'client', {
        from: '2020-01-01T00:00:00.000Z',
        to: '2026-01-01T00:00:00.000Z',
      }),
    ).rejects.toThrow();
    await expect(
      service.feed('user', 'client', { q: 'x'.repeat(81) }),
    ).rejects.toThrow();
    await expect(
      service.feed('user', 'client', { category: 'VENDOR_SECRET_CATEGORY' }),
    ).rejects.toThrow();
    await expect(
      service.feed('user', 'client', { provider: 'internal-adapter' }),
    ).rejects.toThrow();
  });

  it('serializes safe provenance without raw payload or internal provider IDs', async () => {
    const { service } = setup([
      row({
        normalizedAttributes: {
          sourceCategory: 'MATERIAL',
          rawPayload: { secret: true },
          attachments: [],
        },
      }),
    ]);
    const detail = await service.detail('user', row().revisionId);
    expect(detail.data.source).toMatchObject({
      provider: 'kap-source',
      dataset: 'kap-v1',
    });
    expect(detail.data.source).not.toHaveProperty('providerId');
    expect(detail.data.attributes).not.toHaveProperty('rawPayload');
    expect(JSON.stringify(detail)).not.toContain('vendor-secret');
  });

  it('computes relevance from private projections and preserves correction state', async () => {
    const { service } = setup([
      row({
        watchlistRelevant: true,
        portfolioRelevant: true,
        state: 'CORRECTED',
        supersedesRevisionId: '30000000-0000-4000-a000-000000000009',
      }),
    ]);
    const feed = await service.feed('owner-user', 'client', {});
    expect(feed.data.items[0]).toMatchObject({
      relevance: 'BOTH',
      corrected: true,
    });
  });

  it('returns provider-required metadata when no live or licensed provider exists', async () => {
    const { service } = setup([], {
      availability: 'PROVIDER_REQUIRED',
      health: 'UNAVAILABLE',
      checkedAt: null,
    });
    const feed = await service.feed('user', 'client', {});
    expect(feed.meta).toMatchObject({
      providerState: 'PROVIDER_REQUIRED',
      freshness: 'PROVIDER_REQUIRED',
    });
  });
});

function setup(
  rows: readonly EventFeedRow[],
  capability: {
    availability: string;
    health: string;
    checkedAt: Date | null;
  } = {
    availability: 'SUPPORTED_DELAYED',
    health: 'HEALTHY',
    checkedAt: new Date('2026-08-13T12:00:00Z'),
  },
) {
  const reader = {
    capability: vi.fn(() => Promise.resolve(capability)),
    feed: vi.fn(() => Promise.resolve(rows)),
    detail: vi.fn((id: string) =>
      Promise.resolve(
        rows.find((item) => item.revisionId === id) ?? rows[0] ?? null,
      ),
    ),
    revisions: vi.fn(() => Promise.resolve(rows)),
  } satisfies EventReader;
  const limiter = { consume: vi.fn() } as unknown as MarketRateLimiter;
  const config = new ConfigService({
    AUTH_SESSION_HMAC_KEY: ['unit', 'cursor', 'hmac', 'material'].join('-'),
  });
  return { reader, service: new EventsService(reader, limiter, config) };
}

function row(overrides: Partial<EventFeedRow> = {}): EventFeedRow {
  return {
    revisionId: '30000000-0000-4000-a000-000000000001',
    disclosureId: '10000000-0000-4000-a000-000000000001',
    supersedesRevisionId: null,
    externalDisclosureId: 'KAP-1',
    providerRevision: '1',
    title: 'Özel durum açıklaması',
    summary: null,
    disclosureType: 'MATERIAL_EVENT',
    state: 'ACTIVE',
    publishedAt: new Date('2026-08-13T12:00:00Z'),
    effectiveAt: null,
    availableAt: new Date('2026-08-13T12:01:00Z'),
    reportingPeriod: null,
    sourceReference: 'https://kap.example.test/1',
    providerId: 'provider-internal-uuid',
    providerCode: 'kap-source',
    providerDataset: 'kap-v1',
    sourceTimestamp: new Date('2026-08-13T12:00:30Z'),
    ingestedAt: new Date('2026-08-13T12:02:00Z'),
    deliveryMode: 'DELAYED',
    licenseClass: 'DELAYED_DISPLAY_ONLY',
    redistributionClasses: ['EXPORT_PROHIBITED'],
    qualityState: 'DELAYED',
    normalizedAttributes: {},
    companyIds: ['40000000-0000-4000-a000-000000000001'],
    companyNames: ['Test Şirket'],
    instrumentIds: ['50000000-0000-4000-a000-000000000001'],
    symbols: ['TEST'],
    watchlistRelevant: false,
    portfolioRelevant: false,
    marketEventRevisionId: '30000000-0000-4000-a000-000000000001',
    ...overrides,
  };
}
