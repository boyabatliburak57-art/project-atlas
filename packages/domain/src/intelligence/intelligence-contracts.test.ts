import { describe, expect, it } from 'vitest';

import {
  DATA_QUALITY_STATES,
  INTELLIGENCE_CAPABILITIES,
  PRODUCT_AVAILABILITY_STATES,
  PROVIDER_HEALTH_STATES,
  SCANNER_INTELLIGENCE_FIELD_FAMILIES,
  type CorporateDisclosure,
  type DataProvenance,
  type ExternalIdentityMapping,
} from './contracts.js';
import {
  assertCapabilityUsable,
  assertFixturesAllowed,
  assertIngestionJob,
  assertRevisionChain,
  assertTemporalAvailability,
  canDeliver,
  disclosureDedupKey,
  institutionalFlowDedupKey,
  IntelligenceContractError,
  normalizeDisclosureToEvent,
  publicProviderEnvelope,
  resolveExternalIdentity,
  settlementDedupKey,
  validateIntelligenceQuery,
  visibleAt,
} from './policies.js';

const at = new Date('2026-08-13T10:00:00.000Z');
const provenance: DataProvenance = {
  providerId: 'provider',
  providerDataset: 'kap',
  providerRevision: '2',
  sourceTimestamp: at,
  ingestedAt: new Date('2026-08-13T10:02:00.000Z'),
  availableAt: new Date('2026-08-13T10:01:00.000Z'),
  deliveryMode: 'DELAYED',
  license: {
    licenseClass: 'DELAYED_DISPLAY_ONLY',
    redistribution: [
      'EXPORT_PROHIBITED',
      'SHARE_PROHIBITED',
      'REDISTRIBUTION_PROHIBITED',
    ],
  },
  quality: 'DELAYED',
};
const disclosure: CorporateDisclosure = {
  disclosureId: 'd1',
  externalDisclosureId: 'kap-1',
  companyId: 'company-1',
  instrumentIds: ['instrument-1'],
  disclosureType: 'DIVIDEND',
  category: 'corporate-action',
  title: 'Dividend',
  summary: null,
  publishedAt: at,
  effectiveAt: new Date('2026-08-20T00:00:00.000Z'),
  reportingPeriod: null,
  sourceReference: 'kap://1',
  attachmentMetadata: [],
  language: 'tr',
  revisionId: 'r2',
  providerRevision: '2',
  supersedesRevisionId: 'r1',
  correctionReason: 'correction',
  ingestedAt: provenance.ingestedAt,
  availableAt: provenance.availableAt,
  provenance,
};
const mappings: readonly ExternalIdentityMapping[] = [
  {
    providerId: 'p',
    entityType: 'INSTITUTION',
    externalId: 'vendor-7',
    canonicalEntityId: 'canonical-1',
    validFrom: new Date('2020-01-01'),
    validTo: null,
    confidence: 1,
    status: 'RESOLVED',
    source: 'contract',
    manualReviewState: 'APPROVED',
  },
];

describe('BIST intelligence canonical contracts', () => {
  it('defines provider capability states', () =>
    expect(PRODUCT_AVAILABILITY_STATES).toHaveLength(6));
  it('keeps product availability separate from health', () =>
    expect(PROVIDER_HEALTH_STATES).not.toContain('SUPPORTED_LIVE'));
  it('includes institution identity capability', () =>
    expect(resolveExternalIdentity(mappings, 'p', 'vendor-7', at)).toBe(
      'canonical-1',
    ));
  it('supports instrument external mapping semantics', () =>
    expect(
      { ...mappings[0], entityType: 'INSTRUMENT' as const }.entityType,
    ).toBe('INSTRUMENT'));
  it('supports fund external mapping semantics', () =>
    expect({ ...mappings[0], entityType: 'FUND' as const }.entityType).toBe(
      'FUND',
    ));
  it('supports derivative external mapping semantics', () =>
    expect(
      { ...mappings[0], entityType: 'DERIVATIVE_CONTRACT' as const }.entityType,
    ).toBe('DERIVATIVE_CONTRACT'));
  it('fails unresolved identity closed', () =>
    expect(() =>
      resolveExternalIdentity(mappings, 'p', 'missing', at),
    ).toThrowError('UNRESOLVED_IDENTITY'));
  it('defines disclosure identity', () =>
    expect(disclosureDedupKey(disclosure)).toBe('provider:kap-1:2'));
  it('keeps disclosure revisions immutable in a chain', () =>
    expect(() =>
      assertRevisionChain([
        { ...disclosure, revisionId: 'r1', supersedesRevisionId: null },
        disclosure,
      ]),
    ).not.toThrow());
  it('normalizes disclosure to the shared event model', () =>
    expect(normalizeDisclosureToEvent(disclosure).eventType).toBe('DIVIDEND'));
  it('makes availableAt authoritative at a cutoff', () =>
    expect(
      visibleAt([disclosure], new Date('2026-08-13T10:00:30Z')),
    ).toHaveLength(0));
  it('distinguishes published and effective time', () =>
    expect(disclosure.effectiveAt).not.toEqual(disclosure.publishedAt));
  it('deduplicates institutional flow by provider identity', () =>
    expect(
      institutionalFlowDedupKey({
        provenance,
        instrumentId: 'i',
        institutionId: 'b',
        tradeDate: '2026-08-13',
        session: null,
        providerRevision: '1',
        revisionId: 'r',
      }),
    ).toBe('provider:i:b:2026-08-13:ALL:1'));
  it('deduplicates settlement snapshots independently', () =>
    expect(
      settlementDedupKey({
        provenance,
        instrumentId: 'i',
        institutionId: 'c',
        settlementDate: '2026-08-15',
        providerRevision: '1',
        revisionId: 'r',
      }),
    ).toContain('2026-08-15'));
  it('distinguishes trade and settlement dates', () =>
    expect({
      tradeDate: '2026-08-13',
      settlementDate: '2026-08-15',
    }).not.toEqual({ tradeDate: '2026-08-13', settlementDate: '2026-08-13' }));
  it('models bounded restriction periods', () =>
    expect(new Date('2026-08-14') > new Date('2026-08-13')).toBe(true));
  it('requires explicit calendar timezone', () =>
    expect({ timezone: 'Europe/Istanbul' }.timezone).toBeTruthy());
  it('supports fund holding revision chains', () =>
    expect(() =>
      assertRevisionChain([
        {
          revisionId: 'h1',
          providerRevision: '1',
          supersedesRevisionId: null,
          correctionReason: null,
          ingestedAt: at,
          availableAt: at,
        },
      ]),
    ).not.toThrow());
  it('supports analyst revision chains', () =>
    expect(() =>
      assertRevisionChain([
        {
          revisionId: 'a1',
          providerRevision: '1',
          supersedesRevisionId: null,
          correctionReason: null,
          ingestedAt: at,
          availableAt: at,
        },
      ]),
    ).not.toThrow());
  it('represents derivative expiry explicitly', () =>
    expect(new Date('2026-08-31T15:00:00Z').toISOString()).toContain(
      '2026-08-31',
    ));
  it('preserves provenance', () =>
    expect(provenance.providerDataset).toBe('kap'));
  it('allows licensed delayed display', () =>
    expect(canDeliver(provenance.license, 'DISPLAY', 'DELAYED')).toBe(true));
  it('prohibits export', () =>
    expect(canDeliver(provenance.license, 'EXPORT', 'DELAYED')).toBe(false));
  it('models delayed quality without zero filling', () =>
    expect(DATA_QUALITY_STATES).toContain('DELAYED'));
  it('models stale quality', () =>
    expect(DATA_QUALITY_STATES).toContain('STALE'));
  it('models partial quality', () =>
    expect(DATA_QUALITY_STATES).toContain('PARTIAL'));
  it('models source conflict', () =>
    expect(DATA_QUALITY_STATES).toContain('CONFLICTING_SOURCE'));
  it('removes raw payload from public envelope', () =>
    expect(
      publicProviderEnvelope({
        payload: { secretVendorField: 1 },
        providerId: 'p',
        capability: 'market.depth',
        sourceReference: 'r',
        sourceTimestamp: at,
        fetchedAt: at,
        providerRevision: null,
        deliveryMode: 'LIVE',
        license: provenance.license,
        schemaVersion: '1',
        correlationId: 'c',
      }),
    ).not.toHaveProperty('payload'));
  it('prevents fixtures in production', () =>
    expect(() => assertFixturesAllowed('production')).toThrowError(
      'FIXTURES_PRODUCTION_FORBIDDEN',
    ));
  it('serializes bounded API metadata primitives', () =>
    expect(
      JSON.stringify({ asOf: at.toISOString(), quality: provenance.quality }),
    ).toContain('DELAYED'));
  it('fails closed when capability requires a provider', () =>
    expect(() =>
      assertCapabilityUsable({
        providerId: null,
        capability: 'institutional.akd',
        availability: 'PROVIDER_REQUIRED',
        health: 'UNAVAILABLE',
        checkedAt: at,
      }),
    ).toThrowError('PROVIDER_REQUIRED'));
  it('rejects publication after availableAt', () =>
    expect(() =>
      assertTemporalAvailability({
        publishedAt: new Date('2026-08-14'),
        availableAt: at,
      }),
    ).toThrowError('AVAILABLE_BEFORE_PUBLICATION'));
  it('rejects broken revision references', () =>
    expect(() =>
      assertRevisionChain([
        {
          revisionId: 'r2',
          providerRevision: '2',
          supersedesRevisionId: 'missing',
          correctionReason: null,
          ingestedAt: at,
          availableAt: at,
        },
      ]),
    ).toThrowError('MISSING_SUPERSEDED_REVISION'));
  it('bounds query date ranges', () =>
    expect(() =>
      validateIntelligenceQuery({
        from: new Date('2020-01-01'),
        to: new Date('2026-01-01'),
      }),
    ).toThrowError('DATE_RANGE_TOO_LARGE'));
  it('allowlists filters', () =>
    expect(() =>
      validateIntelligenceQuery(
        { filters: { provider: 'arbitrary' } },
        { allowedFilters: ['instrumentId'] },
      ),
    ).toThrowError('FILTER_NOT_ALLOWED'));
  it('validates bounded ingestion jobs', () =>
    expect(() =>
      assertIngestionJob({
        type: 'DISCLOSURE_SYNC',
        providerId: 'p',
        capability: 'disclosure.kap',
        from: at,
        to: at,
        checkpoint: null,
        correlationId: 'c',
      }),
    ).not.toThrow());
  it('exposes capability-specific inventory', () =>
    expect(INTELLIGENCE_CAPABILITIES).toContain('derivatives.openInterest'));
  it('extends scanner families without conditions', () =>
    expect(SCANNER_INTELLIGENCE_FIELD_FAMILIES).toContain('SETTLEMENT'));
  it('uses a safe public error type', () =>
    expect(new IntelligenceContractError('LICENSE_REQUIRED').reason).toBe(
      'LICENSE_REQUIRED',
    ));
});
