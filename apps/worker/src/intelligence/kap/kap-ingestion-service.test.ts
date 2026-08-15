import { describe, expect, it, vi } from 'vitest';
import type {
  ExternalIdentityMapping,
  KapProviderDisclosure,
  NormalizedKapDisclosure,
} from '@atlas/domain';

import type { KapDisclosureProvider, KapIngestionStore } from './contracts';
import {
  KapIngestionError,
  KapIngestionService,
} from './kap-ingestion-service';

const now = new Date('2026-08-13T12:05:00.000Z');
const mappings: readonly ExternalIdentityMapping[] = [
  mapping('COMPANY', 'company-a', '10000000-0000-4000-a000-000000000001'),
  mapping('COMPANY', 'company-b', '10000000-0000-4000-a000-000000000002'),
  mapping('INSTRUMENT', 'instrument-a', '20000000-0000-4000-a000-000000000001'),
];

describe('KAP ingestion lifecycle', () => {
  it('runs FETCH through checkpoint with normalized disclosure and MarketEvent', async () => {
    const store = memoryStore();
    const provider = providerWith([fixture()]);
    const result = await new KapIngestionService(
      provider,
      store,
      () => now,
    ).execute(job());
    expect(provider.fetchDisclosures).toHaveBeenCalledOnce();
    expect(store.persisted).toHaveLength(1);
    expect(store.persisted[0]!.event.attributes['sourceDisclosureId']).toBe(
      store.persisted[0]!.disclosure.disclosureId,
    );
    expect(result).toMatchObject({
      disclosuresInserted: 1,
      eventsInserted: 1,
      rejected: 0,
    });
    expect(store.completions).toEqual([
      {
        runId: 'run-1',
        sourceCursor: 'next-1',
        recordsRead: 1,
        recordsAccepted: 1,
        recordsRejected: 0,
      },
    ]);
  });

  it('is retry-safe and returns completed checkpoint replays without fetching', async () => {
    const store = memoryStore({ completed: true });
    const provider = providerWith([fixture()]);
    const result = await new KapIngestionService(provider, store).execute(
      job(),
    );
    expect(result.replayed).toBe(true);
    expect(provider.fetchDisclosures).not.toHaveBeenCalled();
  });

  it('fails closed without a configured provider context', async () => {
    const store = memoryStore({ context: null });
    await expect(
      new KapIngestionService(providerWith([]), store).execute(job()),
    ).rejects.toMatchObject({
      code: 'KAP_PROVIDER_REQUIRED',
      retryable: false,
    });
  });

  it('bounds date windows and page size', async () => {
    const service = new KapIngestionService(providerWith([]), memoryStore());
    await expect(
      service.execute({ ...job(), from: new Date('2025-01-01') }),
    ).rejects.toBeInstanceOf(KapIngestionError);
    await expect(
      service.execute({ ...job(), limit: 501 }),
    ).rejects.toMatchObject({ code: 'KAP_RANGE_INVALID' });
  });

  it('rejects malformed and unresolved fixture rows without manufacturing identities', async () => {
    const store = memoryStore();
    const result = await new KapIngestionService(
      providerWith([
        fixture({ title: '' }),
        fixture({
          externalDisclosureId: 'unresolved',
          companyExternalIds: ['missing'],
          instrumentExternalIds: [],
        }),
        fixture({ externalDisclosureId: 'valid' }),
      ]),
      store,
      () => now,
    ).execute(job());
    expect(result.rejected).toBe(2);
    expect(store.persisted).toHaveLength(1);
  });

  it('covers the approved provider-contract fixture taxonomy and correction cases', async () => {
    const records = [
      fixture({
        externalDisclosureId: 'material',
        sourceCategory: 'MATERIAL_DISCLOSURE',
      }),
      fixture({
        externalDisclosureId: 'financial',
        sourceCategory: 'FINANCIAL_STATEMENT',
        reportingPeriod: '2026-Q2',
      }),
      fixture({
        externalDisclosureId: 'business',
        sourceCategory: 'NEW_BUSINESS_RELATIONSHIP',
      }),
      fixture({ externalDisclosureId: 'dividend', sourceCategory: 'DIVIDEND' }),
      fixture({
        externalDisclosureId: 'buyback',
        sourceCategory: 'SHARE_BUYBACK',
      }),
      fixture({
        externalDisclosureId: 'capital',
        sourceCategory: 'CAPITAL_INCREASE',
      }),
      fixture({
        externalDisclosureId: 'ipo',
        sourceCategory: 'PUBLIC_OFFERING',
      }),
      fixture({
        externalDisclosureId: 'other',
        sourceCategory: 'UNMAPPED',
        title: 'Sınıflandırılmamış bildirim',
      }),
      fixture({
        externalDisclosureId: 'multi',
        companyExternalIds: ['company-a', 'company-b'],
      }),
      fixture({
        externalDisclosureId: 'correction',
        providerRevision: '2',
        state: 'CORRECTED',
        supersedesProviderRevision: '1',
      }),
      fixture({ externalDisclosureId: 'duplicate' }),
      fixture({ externalDisclosureId: 'duplicate' }),
      fixture({
        externalDisclosureId: 'out-of-order',
        providerRevision: '2',
        state: 'CORRECTED',
        supersedesProviderRevision: '1',
      }),
      fixture({
        externalDisclosureId: 'delayed',
        availableAt: '2026-08-13T12:04:00.000Z',
      }),
      fixture({
        externalDisclosureId: 'partial',
        sourceSummary: null,
        reportingPeriod: null,
      }),
      fixture({
        externalDisclosureId: 'attachment',
        attachments: [
          {
            title: 'PDF',
            mimeType: 'application/pdf',
            sizeBytes: 10,
            sourceUrl: 'https://kap.example.test/a.pdf',
          },
        ],
      }),
      fixture({
        externalDisclosureId: 'invalid-url',
        sourceUrl: 'javascript:alert(1)',
      }),
      fixture({ externalDisclosureId: '', title: '' }),
    ];
    const store = memoryStore();
    const result = await new KapIngestionService(
      providerWith(records),
      store,
      () => now,
    ).execute(job());
    expect(records).toHaveLength(18);
    expect(result.rejected).toBe(2);
    expect(store.persisted).toHaveLength(16);
    expect(
      store.persisted.find(
        (item) => item.disclosure.externalDisclosureId === 'multi',
      )?.companyIds,
    ).toHaveLength(2);
  });
});

function providerWith(
  items: readonly KapProviderDisclosure[],
): KapDisclosureProvider & { fetchDisclosures: ReturnType<typeof vi.fn> } {
  return {
    code: 'kap-fixture',
    dataset: 'kap-contract-v1',
    deliveryMode: 'DELAYED',
    license: {
      licenseClass: 'DELAYED_DISPLAY_ONLY',
      redistribution: ['EXPORT_PROHIBITED', 'SHARE_PROHIBITED'],
    },
    allowedSourceHosts: new Set(['kap.example.test']),
    fetchDisclosures: vi.fn(() =>
      Promise.resolve({ items, nextCursor: 'next-1' }),
    ),
  };
}

function memoryStore(
  options: {
    completed?: boolean;
    context?: {
      providerId: string;
      providerConnectionId: string;
      mappings: readonly ExternalIdentityMapping[];
    } | null;
  } = {},
) {
  const persisted: NormalizedKapDisclosure[] = [];
  const completions: unknown[] = [];
  const store: KapIngestionStore & {
    persisted: NormalizedKapDisclosure[];
    completions: unknown[];
  } = {
    persisted,
    completions,
    resolveContext() {
      return Promise.resolve(
        options.context === undefined
          ? {
              providerId: 'kap-provider',
              providerConnectionId: 'connection-1',
              mappings,
            }
          : options.context,
      );
    },
    beginRun() {
      return Promise.resolve({
        runId: 'run-1',
        completed: options.completed ?? false,
      });
    },
    persist(_runId, records) {
      persisted.push(...records);
      return Promise.resolve({
        disclosuresInserted: records.length,
        eventsInserted: records.length,
        duplicates: 0,
      });
    },
    completeRun(input) {
      completions.push(input);
      return Promise.resolve();
    },
    failRun: () => Promise.resolve(),
  };
  return store;
}

function job() {
  return {
    from: new Date('2026-08-13T00:00:00.000Z'),
    to: new Date('2026-08-13T23:00:00.000Z'),
    cursor: null,
    limit: 100,
    correlationId: 'correlation-1',
  };
}
function mapping(
  entityType: 'COMPANY' | 'INSTRUMENT',
  externalId: string,
  canonicalEntityId: string,
): ExternalIdentityMapping {
  return {
    providerId: 'kap-provider',
    entityType,
    externalId,
    canonicalEntityId,
    validFrom: new Date('2020-01-01'),
    validTo: null,
    confidence: 1,
    status: 'RESOLVED',
    source: 'fixture',
    manualReviewState: 'APPROVED',
  };
}
function fixture(
  overrides: Partial<KapProviderDisclosure> = {},
): KapProviderDisclosure {
  return {
    externalDisclosureId: 'KAP-1',
    providerRevision: '1',
    supersedesProviderRevision: null,
    state: 'ACTIVE',
    sourceCategory: 'MATERIAL_DISCLOSURE',
    title: 'Özel durum açıklaması',
    sourceSummary: null,
    companyExternalIds: ['company-a'],
    instrumentExternalIds: ['instrument-a'],
    publishedAt: '2026-08-13T12:00:00.000Z',
    effectiveAt: null,
    reportingPeriod: null,
    sourceTimestamp: '2026-08-13T12:00:30.000Z',
    availableAt: '2026-08-13T12:01:00.000Z',
    sourceUrl: 'https://kap.example.test/disclosure/1',
    language: 'tr',
    structuredAttributes: {},
    attachments: [],
    ...overrides,
  };
}
