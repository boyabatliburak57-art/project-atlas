import { describe, expect, it } from 'vitest';

import type { ExternalIdentityMapping, MarketMeasure } from './contracts.js';
import {
  findOverlappingMarketMeasureRevisions,
  getActiveMarketMeasures,
  mapMarketMeasureType,
  marketMeasureDedupKey,
  normalizeMarketMeasure,
  normalizeShortSellingActivity,
  resolveMarketMeasureStatus,
  shortSellingActivityDedupKey,
} from './market-structure.js';

const at = new Date('2026-08-15T10:00:00.000Z');
const mapping: ExternalIdentityMapping = {
  providerId: 'provider-id',
  entityType: 'INSTRUMENT',
  externalId: 'ASELS',
  canonicalEntityId: 'instrument-id',
  validFrom: new Date('2020-01-01'),
  validTo: null,
  confidence: 1,
  status: 'RESOLVED',
  source: 'contract',
  manualReviewState: 'APPROVED',
};
const license = {
  licenseClass: 'DISPLAY_ALLOWED' as const,
  redistribution: ['DISPLAY_ALLOWED' as const],
};
const context = {
  providerId: 'provider-id',
  providerDataset: 'measures',
  fetchedAt: new Date('2026-08-15T10:02:00Z'),
  deliveryMode: 'LIVE' as const,
  license,
  mappings: [mapping],
};
const raw = {
  sourceId: 'm-1',
  externalInstrumentId: 'ASELS',
  sourceType: 'SHORT_SELL',
  sourceStatus: 'ACTIVE',
  publishedAt: '2026-08-15T09:00:00Z',
  availableAt: '2026-08-15T09:01:00Z',
  effectiveFrom: '2026-08-15T09:30:00Z',
  effectiveUntil: '2026-08-20T15:00:00Z',
  sourceTimestamp: '2026-08-15T09:00:30Z',
  sourceReference: 'https://provider.example/m-1',
  providerRevision: '1',
  attributes: { legalTextCode: 'SSR' },
};
const normalized = normalizeMarketMeasure(raw, context).measure;

describe('market structure canonical domain', () => {
  it('maps canonical taxonomy', () =>
    expect(mapMarketMeasureType('GROSS_SETTLEMENT')).toBe('GROSS_SETTLEMENT'));
  it('maps unknown source types safely', () =>
    expect(mapMarketMeasureType('vendor-new-rule')).toBe(
      'OTHER_EXCHANGE_MEASURE',
    ));
  it('resolves instrument identity', () =>
    expect(normalized.instrumentId).toBe('instrument-id'));
  it('preserves publishedAt', () =>
    expect(normalized.publishedAt.toISOString()).toContain('09:00:00'));
  it('makes availableAt explicit', () =>
    expect(normalized.availableAt.toISOString()).toContain('09:01:00'));
  it('preserves effectiveFrom', () =>
    expect(normalized.effectiveFrom.toISOString()).toContain('09:30:00'));
  it('preserves effectiveUntil', () =>
    expect(normalized.effectiveUntil?.toISOString()).toContain('2026-08-20'));
  it('resolves active status on server time', () =>
    expect(resolveMarketMeasureStatus(normalized, at)).toBe('ACTIVE'));
  it('resolves scheduled status', () =>
    expect(
      resolveMarketMeasureStatus(normalized, new Date('2026-08-15T09:10:00Z')),
    ).toBe('SCHEDULED'));
  it('resolves expired status', () =>
    expect(resolveMarketMeasureStatus(normalized, new Date('2026-08-21'))).toBe(
      'EXPIRED',
    ));
  it('uses provider revision in dedup identity', () =>
    expect(marketMeasureDedupKey(normalized)).toBe('provider-id:m-1:1'));
  it('preserves source taxonomy', () =>
    expect(normalized.structuredAttributes.sourceTaxonomy).toBe('SHORT_SELL'));
  it('rejects invalid ranges', () =>
    expect(() =>
      normalizeMarketMeasure(
        { ...raw, effectiveUntil: '2026-08-14T00:00:00Z' },
        context,
      ),
    ).toThrowError('INVALID_EFFECTIVE_RANGE'));
  it('rejects availability before publication', () =>
    expect(() =>
      normalizeMarketMeasure(
        { ...raw, availableAt: '2026-08-15T08:00:00Z' },
        context,
      ),
    ).toThrowError('AVAILABLE_BEFORE_PUBLICATION'));
  it('rejects unsafe source references', () =>
    expect(() =>
      normalizeMarketMeasure(
        { ...raw, sourceReference: 'javascript:alert(1)' },
        context,
      ),
    ).toThrowError('SOURCE_REFERENCE_INVALID'));
  it('fails unresolved identity closed', () =>
    expect(() =>
      normalizeMarketMeasure(raw, { ...context, mappings: [] }),
    ).toThrowError('UNRESOLVED_IDENTITY'));
  it('excludes future information from active resolution', () =>
    expect(
      getActiveMarketMeasures(
        [{ ...normalized, availableAt: new Date('2026-08-16') }],
        at,
      ),
    ).toHaveLength(0));
  it('excludes superseded revisions', () => {
    const correction: MarketMeasure = {
      ...normalized,
      revisionId: 'r2',
      supersedesRevisionId: normalized.revisionId,
      providerRevision: '2',
    };
    expect(getActiveMarketMeasures([normalized, correction], at)).toEqual([
      correction,
    ]);
  });
  it('models short-selling restriction separately', () =>
    expect(normalized.type).toBe('SHORT_SELL_RESTRICTION'));
  it('validates short-selling activity', () => {
    const value = normalizeShortSellingActivity(
      {
        sourceId: 's-1',
        externalInstrumentId: 'ASELS',
        tradeDate: '2026-08-15',
        quantity: '100',
        value: '1250.25',
        shareOfTurnover: '0.10',
        dataCutoff: '2026-08-15T15:10:00Z',
        availableAt: '2026-08-15T15:15:00Z',
        sourceTimestamp: '2026-08-15T15:11:00Z',
        providerRevision: '1',
      },
      context,
    ).activity;
    expect(shortSellingActivityDedupKey(value)).toBe('provider-id:s-1:1');
  });
  it('does not synthesize missing activity', () =>
    expect(() =>
      normalizeShortSellingActivity(
        {
          sourceId: 's-1',
          externalInstrumentId: 'ASELS',
          tradeDate: '2026-08-15',
          dataCutoff: '2026-08-15T15:10:00Z',
          availableAt: '2026-08-15T15:15:00Z',
          sourceTimestamp: '2026-08-15T15:11:00Z',
          providerRevision: '1',
        },
        context,
      ),
    ).toThrowError('SHORT_SELLING_ACTIVITY_EMPTY'));
  it('rejects negative quantities', () =>
    expect(() =>
      normalizeShortSellingActivity(
        {
          sourceId: 's-1',
          externalInstrumentId: 'ASELS',
          tradeDate: '2026-08-15',
          quantity: '-1',
          dataCutoff: '2026-08-15T15:10:00Z',
          availableAt: '2026-08-15T15:15:00Z',
          sourceTimestamp: '2026-08-15T15:11:00Z',
          providerRevision: '1',
        },
        context,
      ),
    ).toThrowError('QUANTITY_INVALID'));
  it('preserves delayed state', () =>
    expect(
      normalizeMarketMeasure(raw, { ...context, deliveryMode: 'DELAYED' })
        .measure.provenance.quality,
    ).toBe('DELAYED'));
  it('preserves license policy', () =>
    expect(normalized.provenance.license.licenseClass).toBe('DISPLAY_ALLOWED'));
  it('detects overlapping revisions without supersession', () => {
    const first = normalizeMarketMeasure(raw, context);
    const conflicting = normalizeMarketMeasure(
      { ...raw, providerRevision: '2' },
      context,
    );
    expect(
      findOverlappingMarketMeasureRevisions([first, conflicting]),
    ).toHaveLength(1);
  });
});
