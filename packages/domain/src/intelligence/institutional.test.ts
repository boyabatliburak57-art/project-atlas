import { describe, expect, it } from 'vitest';

import type {
  ExternalIdentityMapping,
  InstitutionalFlowObservation,
} from './contracts';
import {
  aggregateInstitutionalFlows,
  concentrationShares,
  INSTITUTIONAL_COMPARE_METRICS,
  INSTITUTIONAL_METHODOLOGY_VERSION,
  normalizeInstitutionalFlow,
  normalizeSettlementSnapshot,
  rankInstitutionalFlows,
  tradingWindow,
  type InstitutionalNormalizationContext,
  type ProviderInstitutionalFlow,
} from './institutional';

const providerId = '10000000-0000-4000-8000-000000000001';
const instrumentId = '20000000-0000-4000-8000-000000000001';
const institutionId = '30000000-0000-4000-8000-000000000001';
const fetchedAt = new Date('2026-08-14T18:00:00Z');
const mappings: readonly ExternalIdentityMapping[] = [
  mapping('INSTRUMENT', 'ASELS', instrumentId),
  mapping('INSTITUTION', 'BROKER-1', institutionId),
];
const context: InstitutionalNormalizationContext = {
  providerId,
  providerDataset: 'institutional-fixture-v1',
  fetchedAt,
  deliveryMode: 'DELAYED',
  license: {
    licenseClass: 'DELAYED_DISPLAY_ONLY',
    redistribution: ['EXPORT_PROHIBITED', 'SHARE_PROHIBITED'],
  },
  mappings,
};
const flow: ProviderInstitutionalFlow = {
  instrumentExternalId: 'ASELS',
  institutionExternalId: 'BROKER-1',
  tradeDate: '2026-08-14',
  buyQuantity: '10.125',
  sellQuantity: '4.125',
  buyValue: '1000000000000.125',
  sellValue: '250000000000.025',
  currency: 'try',
  asOf: '2026-08-14T17:30:00Z',
  dataCutoff: '2026-08-14T17:15:00Z',
  sourceTimestamp: '2026-08-14T17:20:00Z',
  availableAt: '2026-08-14T17:25:00Z',
  providerRevision: 'r1',
  coverageRatio: '0.82',
};

describe('institutional intelligence canonical model', () => {
  it('resolves canonical instrument and institution identities', () => {
    const result = normalizeInstitutionalFlow(flow, context);
    expect(result.observation.instrumentId).toBe(instrumentId);
    expect(result.observation.institutionId).toBe(institutionId);
  });
  it('does not expose provider IDs as canonical IDs', () =>
    expect(
      normalizeInstitutionalFlow(flow, context).observation.institutionId,
    ).not.toBe('BROKER-1'));
  it('fails closed for an unresolved institution', () =>
    expect(() =>
      normalizeInstitutionalFlow(
        { ...flow, institutionExternalId: 'UNKNOWN' },
        context,
      ),
    ).toThrow('UNRESOLVED_IDENTITY'));
  it('derives net values with decimal precision', () => {
    const result = normalizeInstitutionalFlow(flow, context);
    expect(result.observation.netValue).toBe('750000000000.1');
    expect(result.metricOrigins.netValue).toBe('DERIVED_METRIC');
  });
  it('derives negative net flows without floating point loss', () =>
    expect(
      normalizeInstitutionalFlow(
        { ...flow, buyValue: '0.1', sellValue: '0.3' },
        context,
      ).observation.netValue,
    ).toBe('-0.2'));
  it('preserves provider net value as a source metric', () =>
    expect(
      normalizeInstitutionalFlow(
        { ...flow, netValue: '750000000000.1' },
        context,
      ).metricOrigins.netValue,
    ).toBe('SOURCE_METRIC'));
  it('reports a source conflict rather than replacing provider net', () =>
    expect(() =>
      normalizeInstitutionalFlow({ ...flow, netValue: '1' }, context),
    ).toThrow('SOURCE_CONFLICT'));
  it('keeps missing source fields absent rather than zero', () => {
    const {
      buyQuantity: _buy,
      sellQuantity: _sell,
      ...withoutQuantities
    } = flow;
    expect([_buy, _sell]).toEqual(['10.125', '4.125']);
    const result = normalizeInstitutionalFlow(withoutQuantities, context);
    expect(result.observation.buyQuantity).toBeUndefined();
  });
  it('keeps trade date distinct from settlement date', () => {
    const result = normalizeSettlementSnapshot(
      settlement({ tradeDate: '2026-08-13', settlementDate: '2026-08-15' }),
      context,
    );
    expect(result.snapshot.tradeDate).toBe('2026-08-13');
    expect(result.snapshot.settlementDate).toBe('2026-08-15');
  });
  it('never infers foreign residency when the source omits it', () =>
    expect(
      normalizeSettlementSnapshot(settlement(), context).snapshot.residency,
    ).toBe('UNKNOWN'));
  it('preserves source foreign classification', () =>
    expect(
      normalizeSettlementSnapshot(settlement({ residency: 'FOREIGN' }), context)
        .snapshot.residency,
    ).toBe('FOREIGN'));
  it('rejects holding ratios outside zero and one', () =>
    expect(() =>
      normalizeSettlementSnapshot(
        settlement({ holdingRatio: '1.01' }),
        context,
      ),
    ).toThrow('RATIO_OUT_OF_RANGE'));
  it('rejects negative holdings while allowing negative changes', () => {
    expect(() =>
      normalizeSettlementSnapshot(
        settlement({ holdingQuantity: '-1' }),
        context,
      ),
    ).toThrow();
    expect(
      normalizeSettlementSnapshot(settlement({ changeQuantity: '-1' }), context)
        .snapshot.changeQuantity,
    ).toBe('-1');
  });
  it('records correction provenance without overwriting prior evidence', () => {
    const result = normalizeSettlementSnapshot(
      settlement({ providerRevision: 'r2', supersedesProviderRevision: 'r1' }),
      context,
    );
    expect(result.snapshot.correctionReason).toBe('PROVIDER_CORRECTION');
    expect(result.supersedesProviderRevision).toBe('r1');
  });
  it('makes revision identities deterministic and revision-aware', () => {
    const first = normalizeInstitutionalFlow(flow, context).observation
      .revisionId;
    const replay = normalizeInstitutionalFlow(flow, context).observation
      .revisionId;
    const corrected = normalizeInstitutionalFlow(
      { ...flow, providerRevision: 'r2' },
      context,
    ).observation.revisionId;
    expect(replay).toBe(first);
    expect(corrected).not.toBe(first);
  });
  it('rejects look-ahead availability', () =>
    expect(() =>
      normalizeInstitutionalFlow(
        { ...flow, availableAt: '2026-08-15T00:00:00Z' },
        context,
      ),
    ).toThrow('AVAILABLE_AFTER_INGESTION'));
  it('retains delayed provenance and restrictive license policy', () => {
    const provenance = normalizeInstitutionalFlow(flow, context).observation
      .provenance;
    expect(provenance.deliveryMode).toBe('DELAYED');
    expect(provenance.license.redistribution).toContain('EXPORT_PROHIBITED');
  });
  it('aggregates and ranks top buyers and sellers independently', () => {
    const rows = [observation('a', '12'), observation('b', '-7')];
    const aggregate = aggregateInstitutionalFlows(rows);
    expect(rankInstitutionalFlows(aggregate, 'BUYERS')[0]?.institutionId).toBe(
      'a',
    );
    expect(rankInstitutionalFlows(aggregate, 'SELLERS')[0]?.institutionId).toBe(
      'b',
    );
  });
  it('builds rolling windows from actual trading sessions', () =>
    expect(
      tradingWindow(
        ['2026-08-07', '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13'],
        '2026-08-13',
        5,
      ),
    ).toHaveLength(5));
  it('does not fabricate missing sessions in a rolling window', () =>
    expect(
      tradingWindow(['2026-08-07', '2026-08-13'], '2026-08-13', 5),
    ).toEqual(['2026-08-07', '2026-08-13']));
  it('returns descriptive top concentration shares', () =>
    expect(concentrationShares(['50', '30', '20'])).toEqual({
      top1: '0.5',
      top3: '1',
      top5: '1',
    }));
  it('marks zero-total concentration as not evaluable', () =>
    expect(concentrationShares(['0', '0']).top1).toBeNull());
  it('publishes an explicit money-flow methodology version', () =>
    expect(INSTITUTIONAL_METHODOLOGY_VERSION).toBe(
      'institutional-net-flow-v1',
    ));
  it('registers canonical Compare metrics without duplicating domain calculations', () =>
    expect(INSTITUTIONAL_COMPARE_METRICS.map((metric) => metric.id)).toContain(
      'settlement.foreignHoldingRatio',
    ));
});

function mapping(
  entityType: ExternalIdentityMapping['entityType'],
  externalId: string,
  canonicalEntityId: string,
): ExternalIdentityMapping {
  return {
    providerId,
    entityType,
    externalId,
    canonicalEntityId,
    validFrom: new Date('2020-01-01T00:00:00Z'),
    validTo: null,
    confidence: 1,
    status: 'RESOLVED',
    source: 'MANUAL_APPROVED',
    manualReviewState: 'APPROVED',
  };
}
function settlement(
  overrides: Partial<Parameters<typeof normalizeSettlementSnapshot>[0]> = {},
) {
  return {
    instrumentExternalId: 'ASELS',
    institutionExternalId: 'BROKER-1',
    settlementDate: '2026-08-15',
    holdingQuantity: '1000',
    holdingRatio: '0.25',
    changeQuantity: '10',
    changeRatio: '0.01',
    dataCutoff: '2026-08-15T16:00:00Z',
    sourceTimestamp: '2026-08-15T16:10:00Z',
    availableAt: '2026-08-14T17:25:00Z',
    providerRevision: 'r1',
    ...overrides,
  };
}
function observation(
  institution: string,
  netValue: string,
): InstitutionalFlowObservation {
  const normalized = normalizeInstitutionalFlow(
    {
      ...flow,
      institutionExternalId: 'BROKER-1',
      buyValue: netValue.startsWith('-') ? '0' : netValue,
      sellValue: netValue.startsWith('-') ? netValue.slice(1) : '0',
      netValue,
    },
    {
      ...context,
      mappings: [
        mapping('INSTRUMENT', 'ASELS', instrumentId),
        mapping('INSTITUTION', 'BROKER-1', institution),
      ],
    },
  );
  return normalized.observation;
}
