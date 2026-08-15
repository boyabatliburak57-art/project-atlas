import { createHash } from 'node:crypto';

import { Decimal, parseLedgerDecimal } from '../portfolio/decimal.js';
import type {
  CompareMetricDefinition,
  DataProvenance,
  ExternalIdentityMapping,
  InstitutionalFlowObservation,
  SettlementSnapshot,
} from './contracts.js';
import {
  IntelligenceContractError,
  resolveExternalIdentity,
} from './policies.js';

export const INSTITUTIONAL_METHODOLOGY_VERSION =
  'institutional-net-flow-v1' as const;

export const INSTITUTIONAL_COMPARE_METRICS = [
  {
    id: 'institutional.netFlow',
    domain: 'InstitutionalFlowDomain',
    methodologyVersion: INSTITUTIONAL_METHODOLOGY_VERSION,
    unit: 'CURRENCY',
  },
  {
    id: 'institutional.concentration.top5',
    domain: 'InstitutionalFlowDomain',
    methodologyVersion: 'institutional-concentration-v1',
    unit: 'RATIO',
  },
  {
    id: 'settlement.concentration.top5',
    domain: 'SettlementDomain',
    methodologyVersion: 'settlement-concentration-v1',
    unit: 'RATIO',
  },
  {
    id: 'settlement.foreignHoldingRatio',
    domain: 'SettlementDomain',
    methodologyVersion: 'source-classified-foreign-settlement-v1',
    unit: 'RATIO',
  },
] as const satisfies readonly CompareMetricDefinition[];
export type MetricOrigin = 'SOURCE_METRIC' | 'DERIVED_METRIC';

export interface ProviderInstitutionalFlow {
  readonly instrumentExternalId: string;
  readonly institutionExternalId: string;
  readonly tradeDate: string;
  readonly session?: string | null;
  readonly buyQuantity?: string;
  readonly sellQuantity?: string;
  readonly netQuantity?: string;
  readonly buyValue?: string;
  readonly sellValue?: string;
  readonly netValue?: string;
  readonly buyAveragePrice?: string;
  readonly sellAveragePrice?: string;
  readonly totalVolume?: string;
  readonly marketShare?: string;
  readonly rank?: number;
  readonly currency: string;
  readonly asOf: string;
  readonly dataCutoff: string;
  readonly sourceTimestamp: string;
  readonly availableAt: string;
  readonly providerRevision: string;
  readonly supersedesProviderRevision?: string | null;
  readonly coverageRatio?: string;
}

export interface ProviderSettlementSnapshot {
  readonly instrumentExternalId: string;
  readonly institutionExternalId: string;
  readonly tradeDate?: string | null;
  readonly settlementDate: string;
  readonly holdingQuantity?: string;
  readonly holdingRatio?: string;
  readonly changeQuantity?: string;
  readonly changeRatio?: string;
  readonly residency?: 'FOREIGN' | 'DOMESTIC' | 'UNKNOWN';
  readonly dataCutoff: string;
  readonly sourceTimestamp: string;
  readonly availableAt: string;
  readonly providerRevision: string;
  readonly supersedesProviderRevision?: string | null;
  readonly coverageRatio?: string;
}

export interface InstitutionalNormalizationContext {
  readonly providerId: string;
  readonly providerDataset: string;
  readonly fetchedAt: Date;
  readonly deliveryMode: DataProvenance['deliveryMode'];
  readonly license: DataProvenance['license'];
  readonly mappings: readonly ExternalIdentityMapping[];
}

export interface NormalizedInstitutionalFlow {
  readonly observation: InstitutionalFlowObservation;
  readonly metricOrigins: Readonly<Record<string, MetricOrigin>>;
  readonly coverageRatio: string | null;
  readonly supersedesProviderRevision: string | null;
  readonly reconciliation: 'CONSISTENT' | 'NOT_EVALUABLE';
}

export interface NormalizedSettlement {
  readonly snapshot: SettlementSnapshot;
  readonly coverageRatio: string | null;
  readonly supersedesProviderRevision: string | null;
}

export function normalizeInstitutionalFlow(
  input: ProviderInstitutionalFlow,
  context: InstitutionalNormalizationContext,
): NormalizedInstitutionalFlow {
  const availableAt = parseTimestamp(input.availableAt, 'availableAt');
  const sourceTimestamp = parseTimestamp(
    input.sourceTimestamp,
    'sourceTimestamp',
  );
  const asOf = parseTimestamp(input.asOf, 'asOf');
  const dataCutoff = parseTimestamp(input.dataCutoff, 'dataCutoff');
  assertDate(input.tradeDate, 'tradeDate');
  if (availableAt > context.fetchedAt)
    throw new IntelligenceContractError('AVAILABLE_AFTER_INGESTION');
  const instrumentId = resolve(
    context,
    'INSTRUMENT',
    input.instrumentExternalId,
    availableAt,
  );
  const institutionId = resolve(
    context,
    'INSTITUTION',
    input.institutionExternalId,
    availableAt,
  );
  const values = normalizeFlowValues(input);
  const revisionId = stableUuid([
    context.providerId,
    instrumentId,
    institutionId,
    input.tradeDate,
    input.session ?? 'ALL',
    input.providerRevision,
  ]);
  const provenance = makeProvenance(
    context,
    input.providerRevision,
    sourceTimestamp,
    availableAt,
    values.quality,
  );
  return {
    observation: {
      revisionId,
      providerRevision: input.providerRevision,
      supersedesRevisionId: null,
      correctionReason: input.supersedesProviderRevision
        ? 'PROVIDER_CORRECTION'
        : null,
      ingestedAt: context.fetchedAt,
      availableAt,
      instrumentId,
      institutionId,
      tradeDate: input.tradeDate,
      session: input.session ?? 'ALL',
      ...values.metrics,
      currency: normalizeCurrency(input.currency),
      asOf,
      dataCutoff,
      derivedMetrics: Object.fromEntries(
        Object.entries(values.origins)
          .filter(([, origin]) => origin === 'DERIVED_METRIC')
          .map(([key]) => [key, values.metrics[key] as string]),
      ),
      provenance,
    },
    metricOrigins: values.origins,
    coverageRatio: optionalRatio(input.coverageRatio, 'coverageRatio'),
    supersedesProviderRevision: input.supersedesProviderRevision ?? null,
    reconciliation: values.reconciliation,
  };
}

export function normalizeSettlementSnapshot(
  input: ProviderSettlementSnapshot,
  context: InstitutionalNormalizationContext,
): NormalizedSettlement {
  const availableAt = parseTimestamp(input.availableAt, 'availableAt');
  assertDate(input.settlementDate, 'settlementDate');
  if (input.tradeDate) assertDate(input.tradeDate, 'tradeDate');
  if (availableAt > context.fetchedAt)
    throw new IntelligenceContractError('AVAILABLE_AFTER_INGESTION');
  const instrumentId = resolve(
    context,
    'INSTRUMENT',
    input.instrumentExternalId,
    availableAt,
  );
  const institutionId = resolve(
    context,
    'INSTITUTION',
    input.institutionExternalId,
    availableAt,
  );
  const revisionId = stableUuid([
    context.providerId,
    instrumentId,
    institutionId,
    input.settlementDate,
    input.providerRevision,
  ]);
  return {
    snapshot: {
      revisionId,
      providerRevision: input.providerRevision,
      supersedesRevisionId: null,
      correctionReason: input.supersedesProviderRevision
        ? 'PROVIDER_CORRECTION'
        : null,
      ingestedAt: context.fetchedAt,
      availableAt,
      instrumentId,
      institutionId,
      tradeDate: input.tradeDate ?? null,
      settlementDate: input.settlementDate,
      ...(input.holdingQuantity === undefined
        ? {}
        : {
            holdingQuantity: nonNegative(
              input.holdingQuantity,
              'holdingQuantity',
            ),
          }),
      ...(input.holdingRatio === undefined
        ? {}
        : { holdingRatio: ratio(input.holdingRatio, 'holdingRatio') }),
      ...(input.changeQuantity === undefined
        ? {}
        : { changeQuantity: decimal(input.changeQuantity, 'changeQuantity') }),
      ...(input.changeRatio === undefined
        ? {}
        : { changeRatio: signedRatio(input.changeRatio, 'changeRatio') }),
      residency: input.residency ?? 'UNKNOWN',
      dataCutoff: parseTimestamp(input.dataCutoff, 'dataCutoff'),
      provenance: makeProvenance(
        context,
        input.providerRevision,
        parseTimestamp(input.sourceTimestamp, 'sourceTimestamp'),
        availableAt,
        input.coverageRatio === undefined ? 'PARTIAL' : 'COMPLETE',
      ),
    },
    coverageRatio: optionalRatio(input.coverageRatio, 'coverageRatio'),
    supersedesProviderRevision: input.supersedesProviderRevision ?? null,
  };
}

export interface FlowAggregate {
  readonly institutionId: string;
  readonly buyValue: string | null;
  readonly sellValue: string | null;
  readonly netValue: string | null;
  readonly observationCount: number;
}

export function aggregateInstitutionalFlows(
  observations: readonly InstitutionalFlowObservation[],
): readonly FlowAggregate[] {
  const grouped = new Map<
    string,
    {
      buy: Decimal | null;
      sell: Decimal | null;
      net: Decimal | null;
      count: number;
    }
  >();
  for (const item of observations) {
    const current = grouped.get(item.institutionId) ?? {
      buy: null,
      sell: null,
      net: null,
      count: 0,
    };
    current.buy = addNullable(current.buy, item.buyValue);
    current.sell = addNullable(current.sell, item.sellValue);
    current.net = addNullable(current.net, item.netValue);
    current.count += 1;
    grouped.set(item.institutionId, current);
  }
  return [...grouped.entries()].map(([institutionId, value]) => ({
    institutionId,
    buyValue: value.buy?.toString() ?? null,
    sellValue: value.sell?.toString() ?? null,
    netValue: value.net?.toString() ?? null,
    observationCount: value.count,
  }));
}

export function rankInstitutionalFlows(
  aggregates: readonly FlowAggregate[],
  direction: 'BUYERS' | 'SELLERS',
): readonly FlowAggregate[] {
  return [...aggregates].sort((left, right) => {
    const a = left.netValue === null ? null : Decimal.parse(left.netValue);
    const b = right.netValue === null ? null : Decimal.parse(right.netValue);
    if (a === null) return b === null ? 0 : 1;
    if (b === null) return -1;
    return direction === 'BUYERS' ? b.compare(a) : a.compare(b);
  });
}

export function tradingWindow(
  availableTradingDates: readonly string[],
  endDate: string,
  sessions: 1 | 5 | 20,
): readonly string[] {
  assertDate(endDate, 'endDate');
  const unique = [...new Set(availableTradingDates)].sort();
  let endIndex = -1;
  for (let index = 0; index < unique.length; index += 1)
    if ((unique[index] ?? '') <= endDate) endIndex = index;
  if (endIndex < 0) return [];
  return unique.slice(Math.max(0, endIndex - sessions + 1), endIndex + 1);
}

export function concentrationShares(values: readonly string[]): {
  readonly top1: string | null;
  readonly top3: string | null;
  readonly top5: string | null;
} {
  const parsed = values.map((value) => nonNegative(value, 'concentration'));
  const total = parsed.reduce(
    (sum, value) => sum.plus(Decimal.parse(value)),
    Decimal.ZERO,
  );
  if (total.isZero()) return { top1: null, top3: null, top5: null };
  const sorted = parsed
    .map((value) => Decimal.parse(value))
    .sort((a, b) => b.compare(a));
  const share = (count: number) =>
    sorted
      .slice(0, count)
      .reduce((sum, value) => sum.plus(value), Decimal.ZERO)
      .dividedBy(total)
      .toString();
  return { top1: share(1), top3: share(3), top5: share(5) };
}

function normalizeFlowValues(input: ProviderInstitutionalFlow) {
  const metrics: Record<string, string> = {};
  const origins: Record<string, MetricOrigin> = {};
  for (const key of [
    'buyQuantity',
    'sellQuantity',
    'netQuantity',
    'buyValue',
    'sellValue',
    'netValue',
    'buyAveragePrice',
    'sellAveragePrice',
    'totalVolume',
    'marketShare',
  ] as const) {
    const value = input[key];
    if (value === undefined) continue;
    metrics[key] =
      key === 'marketShare' ? ratio(value, key) : decimal(value, key);
    origins[key] = 'SOURCE_METRIC';
  }
  let reconciliation: 'CONSISTENT' | 'NOT_EVALUABLE' = 'NOT_EVALUABLE';
  if (metrics.buyValue !== undefined && metrics.sellValue !== undefined) {
    const derived = Decimal.parse(metrics.buyValue)
      .minus(Decimal.parse(metrics.sellValue))
      .toString();
    if (metrics.netValue === undefined) {
      metrics.netValue = derived;
      origins.netValue = 'DERIVED_METRIC';
    } else if (
      Decimal.parse(metrics.netValue).compare(Decimal.parse(derived)) !== 0
    ) {
      throw new IntelligenceContractError('SOURCE_CONFLICT');
    }
    reconciliation = 'CONSISTENT';
  }
  if (metrics.buyQuantity !== undefined && metrics.sellQuantity !== undefined) {
    const derived = Decimal.parse(metrics.buyQuantity)
      .minus(Decimal.parse(metrics.sellQuantity))
      .toString();
    if (metrics.netQuantity === undefined) {
      metrics.netQuantity = derived;
      origins.netQuantity = 'DERIVED_METRIC';
    } else if (
      Decimal.parse(metrics.netQuantity).compare(Decimal.parse(derived)) !== 0
    ) {
      throw new IntelligenceContractError('SOURCE_CONFLICT');
    }
  }
  if (Object.keys(metrics).length === 0)
    throw new IntelligenceContractError('NOT_EVALUABLE');
  return {
    metrics,
    origins,
    reconciliation,
    quality:
      input.buyValue === undefined || input.sellValue === undefined
        ? ('PARTIAL' as const)
        : ('COMPLETE' as const),
  };
}

function makeProvenance(
  context: InstitutionalNormalizationContext,
  providerRevision: string,
  sourceTimestamp: Date,
  availableAt: Date,
  quality: DataProvenance['quality'],
): DataProvenance {
  return {
    providerId: context.providerId,
    providerDataset: context.providerDataset,
    providerRevision,
    sourceTimestamp,
    ingestedAt: context.fetchedAt,
    availableAt,
    license: context.license,
    deliveryMode: context.deliveryMode,
    quality,
  };
}

function resolve(
  context: InstitutionalNormalizationContext,
  entityType: 'INSTRUMENT' | 'INSTITUTION',
  externalId: string,
  at: Date,
): string {
  return resolveExternalIdentity(
    context.mappings.filter((mapping) => mapping.entityType === entityType),
    context.providerId,
    externalId,
    at,
  );
}
function decimal(value: string, field: string) {
  return parseLedgerDecimal(value, field).toDatabaseString(field);
}
function nonNegative(value: string, field: string) {
  return parseLedgerDecimal(value, field, {
    nonNegative: true,
  }).toDatabaseString(field);
}
function ratio(value: string, field: string) {
  const result = nonNegative(value, field);
  if (Decimal.parse(result).compare(Decimal.parse('1')) > 0)
    throw new IntelligenceContractError('RATIO_OUT_OF_RANGE');
  return result;
}
function signedRatio(value: string, field: string) {
  const result = decimal(value, field);
  const parsed = Decimal.parse(result);
  if (
    parsed.compare(Decimal.parse('-1')) < 0 ||
    parsed.compare(Decimal.parse('1')) > 0
  )
    throw new IntelligenceContractError('RATIO_OUT_OF_RANGE');
  return result;
}
function optionalRatio(value: string | undefined, field: string) {
  return value === undefined ? null : ratio(value, field);
}
function normalizeCurrency(value: string) {
  const currency = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/u.test(currency))
    throw new IntelligenceContractError('CURRENCY_INVALID');
  return currency;
}
function parseTimestamp(value: string, field: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()))
    throw new IntelligenceContractError(`${field.toUpperCase()}_INVALID`);
  return parsed;
}
function assertDate(value: string, field: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/u.test(value) ||
    Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  )
    throw new IntelligenceContractError(`${field.toUpperCase()}_INVALID`);
}
function stableUuid(parts: readonly string[]) {
  const hash = createHash('sha256').update(parts.join('\u0000')).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
function addNullable(current: Decimal | null, value: string | undefined) {
  if (value === undefined) return current;
  const parsed = Decimal.parse(value);
  return current === null ? parsed : current.plus(parsed);
}
