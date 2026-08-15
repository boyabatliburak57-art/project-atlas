import { performance } from 'node:perf_hooks';

import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';

import type { MarketRateLimiter } from '../market/market-overview.ports';
import type { EventFeedQuery, EventFeedRow, EventReader } from './events.ports';
import { EventsService } from './events.service';

describe('KAP feed bounded performance contract', () => {
  it('keeps feed, filters, search, company relevance and detail bounded over 1,200 disclosures', async () => {
    const rows = Array.from({ length: 1_200 }, (_, index) => eventRow(index));
    const reader = new InMemoryPerformanceReader(rows);
    const limiter = { consume: vi.fn() } as unknown as MarketRateLimiter;
    const service = new EventsService(
      reader,
      limiter,
      new ConfigService({
        AUTH_SESSION_HMAC_KEY: 'task-110d-performance-cursor-key',
      }),
    );

    const startedAt = performance.now();
    const feed = await service.feed('owner-user', 'performance-client', {
      limit: 20,
    });
    const category = await service.feed('owner-user', 'performance-client', {
      category: 'DIVIDEND',
      limit: 20,
    });
    const search = await service.feed('owner-user', 'performance-client', {
      q: 'sözleşme',
      limit: 20,
    });
    const company = await service.feed(
      'owner-user',
      'performance-client',
      { relevance: 'ANY', limit: 20 },
      { symbol: 'TEST' },
    );
    const detail = await service.detail('owner-user', rows[0]!.revisionId);
    const elapsedMs = performance.now() - startedAt;

    expect(feed.data.items).toHaveLength(20);
    expect(category.data.items).toHaveLength(20);
    expect(search.data.items).toHaveLength(20);
    expect(company.data.items).toHaveLength(20);
    expect(detail.data.id).toBe(rows[0]!.revisionId);
    expect(reader.maximumReturnedRows).toBe(21);
    expect(elapsedMs).toBeLessThan(1_000);
  });
});

class InMemoryPerformanceReader implements EventReader {
  maximumReturnedRows = 0;

  constructor(private readonly rows: readonly EventFeedRow[]) {}

  capability() {
    return Promise.resolve({
      availability: 'SUPPORTED_DELAYED',
      health: 'HEALTHY',
      checkedAt: new Date('2026-08-13T12:00:00Z'),
    });
  }

  feed(query: EventFeedQuery) {
    const selected = this.rows
      .filter(
        (row) =>
          query.categories.length === 0 ||
          query.categories.includes(row.disclosureType),
      )
      .filter(
        (row) =>
          !query.search ||
          `${row.title} ${row.companyNames.join(' ')} ${row.symbols.join(' ')}`
            .toLocaleLowerCase('tr-TR')
            .includes(query.search),
      )
      .filter((row) => !query.symbol || row.symbols.includes(query.symbol))
      .filter(
        (row) =>
          !query.relevance || row.watchlistRelevant || row.portfolioRelevant,
      )
      .slice(0, query.limit);
    this.maximumReturnedRows = Math.max(
      this.maximumReturnedRows,
      selected.length,
    );
    return Promise.resolve(selected);
  }

  detail(revisionId: string) {
    return Promise.resolve(
      this.rows.find((row) => row.revisionId === revisionId) ?? null,
    );
  }

  revisions(disclosureId: string) {
    return Promise.resolve(
      this.rows.filter((row) => row.disclosureId === disclosureId),
    );
  }
}

function eventRow(index: number): EventFeedRow {
  const suffix = index.toString(16).padStart(12, '0');
  const dividend = index % 3 === 0;
  return {
    revisionId: `30000000-0000-4000-a000-${suffix}`,
    disclosureId: `10000000-0000-4000-a000-${suffix}`,
    supersedesRevisionId: null,
    externalDisclosureId: `KAP-${index}`,
    providerRevision: '1',
    title: dividend ? 'Temettü kararı' : 'Yeni sözleşme açıklaması',
    summary: null,
    disclosureType: dividend ? 'DIVIDEND' : 'NEW_BUSINESS',
    state: 'ACTIVE',
    publishedAt: new Date(1_776_072_000_000 - index * 1_000),
    effectiveAt: null,
    availableAt: new Date(1_776_072_060_000 - index * 1_000),
    reportingPeriod: null,
    sourceReference: `https://kap.example.test/${index}`,
    providerId: 'provider-internal-uuid',
    providerCode: 'kap-source',
    providerDataset: 'kap-v1',
    sourceTimestamp: new Date(1_776_072_030_000 - index * 1_000),
    ingestedAt: new Date(1_776_072_090_000 - index * 1_000),
    deliveryMode: 'DELAYED',
    licenseClass: 'DELAYED_DISPLAY_ONLY',
    redistributionClasses: ['EXPORT_PROHIBITED'],
    qualityState: 'DELAYED',
    normalizedAttributes: {},
    companyIds: ['40000000-0000-4000-a000-000000000001'],
    companyNames: ['Test Şirket'],
    instrumentIds: ['50000000-0000-4000-a000-000000000001'],
    symbols: ['TEST'],
    watchlistRelevant: index % 2 === 0,
    portfolioRelevant: index % 5 === 0,
    marketEventRevisionId: `30000000-0000-4000-a000-${suffix}`,
  };
}
