import { describe, expect, it } from 'vitest';

import type { ExternalIdentityMapping } from './contracts.js';
import {
  classifyKapDisclosure,
  eventRelevance,
  toMarketEventAlertCandidate,
  normalizeKapDisclosure,
  normalizeKapSearch,
  validateExternalSourceUrl,
  type KapProviderDisclosure,
} from './kap.js';

const now = new Date('2026-08-13T12:05:00.000Z');
const allowedHosts = new Set(['kap.example.test', 'docs.kap.example.test']);
const mappings: readonly ExternalIdentityMapping[] = [
  mapping('COMPANY', 'company-a', '10000000-0000-4000-a000-000000000001'),
  mapping('COMPANY', 'company-b', '10000000-0000-4000-a000-000000000002'),
  mapping('INSTRUMENT', 'instrument-a', '20000000-0000-4000-a000-000000000001'),
];

describe('KAP classification and canonical normalization', () => {
  it.each([
    ['FINANCIAL_STATEMENT', 'FINANCIAL_RESULT'],
    ['MATERIAL_DISCLOSURE', 'MATERIAL_EVENT'],
    ['NEW_BUSINESS_RELATIONSHIP', 'NEW_BUSINESS'],
    ['SHARE_BUYBACK', 'BUYBACK'],
    ['DIVIDEND', 'DIVIDEND'],
    ['CAPITAL_INCREASE', 'CAPITAL_INCREASE'],
    ['CAPITAL_DECREASE', 'CAPITAL_DECREASE'],
    ['SHARE_SPLIT', 'SPLIT'],
    ['MERGER', 'MERGER'],
    ['ACQUISITION', 'ACQUISITION'],
    ['PUBLIC_OFFERING', 'IPO'],
  ])('maps structured category %s to %s', (source, expected) => {
    expect(classifyKapDisclosure(source, 'Başlık').type).toBe(expected);
  });

  it('falls back to OTHER for unknown category', () => {
    expect(classifyKapDisclosure('UNMAPPED', 'Genel açıklama')).toMatchObject({
      type: 'OTHER',
      confidence: 'FALLBACK',
      methodologyVersion: 'kap-classification-v1',
    });
  });

  it('uses deterministic title rule without AI dependency', () => {
    expect(
      classifyKapDisclosure('UNMAPPED', 'Yeni iş ilişkisi hakkında').type,
    ).toBe('NEW_BUSINESS');
  });

  it('normalizes standard disclosure and MarketEvent once', () => {
    const result = normalizeKapDisclosure(fixture(), context());
    expect(result.disclosure.disclosureType).toBe('MATERIAL_EVENT');
    expect(result.event.attributes['sourceDisclosureId']).toBe(
      result.disclosure.disclosureId,
    );
    expect(result.event.availableAt).toEqual(result.disclosure.availableAt);
  });

  it('preserves financial reporting period but not statement values', () => {
    const result = normalizeKapDisclosure(
      fixture({
        sourceCategory: 'FINANCIAL_STATEMENT',
        reportingPeriod: '2026-Q2',
        structuredAttributes: {
          fiscalYear: 2026,
          fiscalPeriod: 'Q2',
          revenue: 999,
        },
      }),
      context(),
    );
    expect(result.event.attributes).toMatchObject({
      fiscalYear: 2026,
      fiscalPeriod: 'Q2',
      reportingPeriod: '2026-Q2',
    });
    expect(result.event.attributes).not.toHaveProperty('revenue');
  });

  it('keeps only source-confirmed new-business attributes', () => {
    const result = normalizeKapDisclosure(
      fixture({
        sourceCategory: 'NEW_BUSINESS_RELATIONSHIP',
        structuredAttributes: {
          counterparty: 'Source supplied',
          contractAmount: '1000',
          guessedMargin: '25%',
        },
      }),
      context(),
    );
    expect(result.event.attributes).toHaveProperty('counterparty');
    expect(result.event.attributes).not.toHaveProperty('guessedMargin');
  });

  it('distinguishes buyback lifecycle stage', () => {
    expect(
      normalizeKapDisclosure(
        fixture({
          sourceCategory: 'SHARE_BUYBACK',
          structuredAttributes: { buybackStage: 'ACTUAL_TRANSACTION' },
        }),
        context(),
      ).event.attributes['buybackStage'],
    ).toBe('ACTUAL_TRANSACTION');
  });

  it('retains confirmed dividend calendar attributes', () => {
    const result = normalizeKapDisclosure(
      fixture({
        sourceCategory: 'DIVIDEND',
        structuredAttributes: {
          decisionState: 'APPROVED',
          paymentDate: '2026-09-01',
          inventedYield: '8%',
        },
      }),
      context(),
    );
    expect(result.event.attributes).toMatchObject({
      decisionState: 'APPROVED',
      paymentDate: '2026-09-01',
    });
    expect(result.event.attributes).not.toHaveProperty('inventedYield');
  });

  it('normalizes capital action without applying it', () => {
    const result = normalizeKapDisclosure(
      fixture({
        sourceCategory: 'CAPITAL_INCREASE',
        structuredAttributes: { effectiveDate: '2026-10-01' },
      }),
      context(),
    );
    expect(result.event.eventType).toBe('CAPITAL_INCREASE');
    expect(result.event.attributes).not.toHaveProperty('applied');
  });

  it('normalizes IPO event', () =>
    expect(
      normalizeKapDisclosure(
        fixture({ sourceCategory: 'PUBLIC_OFFERING' }),
        context(),
      ).event.eventType,
    ).toBe('IPO'));

  it('supports multi-company association', () => {
    const result = normalizeKapDisclosure(
      fixture({ companyExternalIds: ['company-a', 'company-b'] }),
      context(),
    );
    expect(result.companyIds).toHaveLength(2);
  });

  it('fails unresolved company identity closed', () => {
    expect(() =>
      normalizeKapDisclosure(
        fixture({ companyExternalIds: ['unknown'], instrumentExternalIds: [] }),
        context(),
      ),
    ).toThrowError('UNRESOLVED_IDENTITY');
  });

  it('preserves correction and out-of-order chain state', () => {
    const result = normalizeKapDisclosure(
      fixture({
        providerRevision: '2',
        supersedesProviderRevision: '1',
        state: 'CORRECTED',
      }),
      context(),
    );
    expect(result).toMatchObject({
      state: 'CORRECTED',
      chainStatus: 'AWAITING_PREVIOUS_REVISION',
      supersedesProviderRevision: '1',
    });
  });

  it('preserves withdrawn records', () =>
    expect(
      normalizeKapDisclosure(fixture({ state: 'WITHDRAWN' }), context()).state,
    ).toBe('WITHDRAWN'));

  it('creates stable identities for at-least-once delivery', () => {
    const first = normalizeKapDisclosure(fixture(), context());
    const replay = normalizeKapDisclosure(fixture(), context());
    expect(replay.disclosure.revisionId).toBe(first.disclosure.revisionId);
    expect(replay.event.id).toBe(first.event.id);
  });

  it('keeps publishedAt and availableAt distinct for no-look-ahead', () => {
    const result = normalizeKapDisclosure(fixture(), context());
    expect(result.disclosure.availableAt > result.disclosure.publishedAt).toBe(
      true,
    );
  });

  it('strips provider HTML instead of rendering it', () => {
    expect(
      normalizeKapDisclosure(
        fixture({ title: '<b>Başlık</b><script>x</script>' }),
        context(),
      ).disclosure.title,
    ).toBe('Başlık x');
  });

  it('keeps attachment metadata and validates its URL', () => {
    const result = normalizeKapDisclosure(
      fixture({
        attachments: [
          {
            title: 'Ek',
            mimeType: 'application/pdf',
            sizeBytes: 120,
            sourceUrl: 'https://docs.kap.example.test/a.pdf',
          },
        ],
      }),
      context(),
    );
    expect(result.disclosure.attachmentMetadata[0]).toMatchObject({
      title: 'Ek',
      mimeType: 'application/pdf',
      sizeBytes: '120',
    });
  });

  it.each([
    'javascript:alert(1)',
    'file:///tmp/x',
    'data:text/plain,x',
    'http://kap.example.test/a',
    'https://evil.example/a',
  ])('rejects unsafe source URL %s', (url) =>
    expect(() => validateExternalSourceUrl(url, allowedHosts)).toThrowError(
      'INVALID_SOURCE_URL',
    ),
  );

  it('rejects credentials in source URL', () =>
    expect(() =>
      validateExternalSourceUrl(
        'https://token:secret@kap.example.test/a',
        allowedHosts,
      ),
    ).toThrowError('SOURCE_URL_CREDENTIALS_FORBIDDEN'));

  it('bounds and normalizes search', () => {
    expect(normalizeKapSearch('  Temettü   Açıklaması ')).toBe(
      'Temettü Açıklaması',
    );
    expect(() => normalizeKapSearch('x')).toThrowError('INVALID_SEARCH_QUERY');
  });

  it.each([
    [new Set(['i']), new Set<string>(), 'WATCHLIST_RELEVANT'],
    [new Set<string>(), new Set(['i']), 'PORTFOLIO_RELEVANT'],
    [new Set(['i']), new Set(['i']), 'BOTH'],
    [new Set<string>(), new Set<string>(), 'NONE'],
  ])(
    'computes user relevance without persisting it',
    (watchlist, portfolio, expected) =>
      expect(eventRelevance(['i'], watchlist, portfolio)).toBe(expected),
  );

  it('creates point-in-time alert candidates by reference rather than copied content', () => {
    const normalized = normalizeKapDisclosure(fixture(), context());
    const candidate = toMarketEventAlertCandidate(normalized);
    expect(candidate.availableAt).toEqual(new Date(fixture().availableAt));
    expect(candidate).not.toHaveProperty('title');
    expect(candidate).not.toHaveProperty('summary');
  });
});

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
    source: 'fixture-contract',
    manualReviewState: 'APPROVED',
  };
}

function context() {
  return {
    providerId: 'kap-provider',
    providerDataset: 'kap-disclosures-v1',
    deliveryMode: 'DELAYED' as const,
    license: {
      licenseClass: 'DELAYED_DISPLAY_ONLY' as const,
      redistribution: [
        'EXPORT_PROHIBITED' as const,
        'SHARE_PROHIBITED' as const,
      ],
    },
    fetchedAt: now,
    mappings,
    allowedSourceHosts: allowedHosts,
  };
}

function fixture(
  overrides: Partial<KapProviderDisclosure> = {},
): KapProviderDisclosure {
  return {
    externalDisclosureId: 'KAP-100',
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
    sourceUrl: 'https://kap.example.test/disclosure/100',
    language: 'tr',
    structuredAttributes: {},
    attachments: [],
    ...overrides,
  };
}
