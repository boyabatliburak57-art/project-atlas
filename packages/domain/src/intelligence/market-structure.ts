import type {
  DataProvenance,
  ExternalIdentityMapping,
  IntelligenceLicensePolicy,
  MarketMeasure,
  MarketMeasureType,
  ShortSellingActivity,
} from './contracts.js';
import { resolveExternalIdentity } from './policies.js';

export const MARKET_MEASURE_TYPES = [
  'SHORT_SELL_RESTRICTION',
  'MARGIN_TRADING_RESTRICTION',
  'GROSS_SETTLEMENT',
  'SINGLE_PRICE',
  'ORDER_PACKAGE_MEASURE',
  'OTHER_EXCHANGE_MEASURE',
] as const satisfies readonly MarketMeasureType[];

export const MARKET_MEASURE_STATUSES = [
  'SCHEDULED',
  'ACTIVE',
  'EXPIRED',
  'CORRECTED',
  'SUPERSEDED',
  'CANCELLED',
] as const;

const SOURCE_TYPE_MAP: Readonly<Record<string, MarketMeasureType>> = {
  SHORT_SELL: 'SHORT_SELL_RESTRICTION',
  CREDIT_MARGIN: 'MARGIN_TRADING_RESTRICTION',
  GROSS_SETTLEMENT: 'GROSS_SETTLEMENT',
  SINGLE_PRICE: 'SINGLE_PRICE',
  ORDER_PACKAGE: 'ORDER_PACKAGE_MEASURE',
};

export interface ProviderMarketMeasure {
  readonly sourceId: string;
  readonly externalInstrumentId: string;
  readonly sourceType: string;
  readonly sourceStatus?: string;
  readonly publishedAt: string;
  readonly availableAt: string;
  readonly effectiveFrom: string;
  readonly effectiveUntil?: string | null;
  readonly sourceTimestamp: string;
  readonly sourceReference: string;
  readonly providerRevision: string;
  readonly supersedesProviderRevision?: string | null;
  readonly correctionReason?: string | null;
  readonly attributes?: Readonly<Record<string, unknown>>;
}

export interface ProviderShortSellingActivity {
  readonly sourceId: string;
  readonly externalInstrumentId: string;
  readonly tradeDate: string;
  readonly session?: string | null;
  readonly quantity?: string;
  readonly value?: string;
  readonly shareOfTurnover?: string;
  readonly dataCutoff: string;
  readonly availableAt: string;
  readonly sourceTimestamp: string;
  readonly providerRevision: string;
  readonly supersedesProviderRevision?: string | null;
  readonly correctionReason?: string | null;
}

export interface MarketStructureNormalizationContext {
  readonly providerId: string;
  readonly providerDataset: string;
  readonly fetchedAt: Date;
  readonly deliveryMode: 'LIVE' | 'DELAYED';
  readonly license: IntelligenceLicensePolicy;
  readonly mappings: readonly ExternalIdentityMapping[];
}

export interface NormalizedMarketMeasure {
  readonly measure: MarketMeasure;
  readonly supersedesProviderRevision: string | null;
}

export interface NormalizedShortSellingActivity {
  readonly activity: ShortSellingActivity;
  readonly supersedesProviderRevision: string | null;
}

export class MarketStructureContractError extends Error {
  override readonly name = 'MarketStructureContractError';
}

export function mapMarketMeasureType(sourceType: string): MarketMeasureType {
  return (
    SOURCE_TYPE_MAP[sourceType.trim().toUpperCase()] ?? 'OTHER_EXCHANGE_MEASURE'
  );
}

export function normalizeMarketMeasure(
  input: ProviderMarketMeasure,
  context: MarketStructureNormalizationContext,
): NormalizedMarketMeasure {
  const publishedAt = instant(input.publishedAt, 'PUBLISHED_AT_INVALID');
  const availableAt = instant(input.availableAt, 'AVAILABLE_AT_INVALID');
  const effectiveFrom = instant(input.effectiveFrom, 'EFFECTIVE_FROM_INVALID');
  const effectiveUntil = input.effectiveUntil
    ? instant(input.effectiveUntil, 'EFFECTIVE_UNTIL_INVALID')
    : null;
  if (availableAt < publishedAt) fail('AVAILABLE_BEFORE_PUBLICATION');
  if (effectiveUntil && effectiveUntil < effectiveFrom)
    fail('INVALID_EFFECTIVE_RANGE');
  if (!/^https:\/\//u.test(input.sourceReference))
    fail('SOURCE_REFERENCE_INVALID');
  const instrumentId = resolveExternalIdentity(
    context.mappings,
    context.providerId,
    input.externalInstrumentId,
    availableAt,
  );
  const provenance = provenanceFor(input, context, availableAt);
  const type = mapMarketMeasureType(input.sourceType);
  return {
    measure: {
      measureId: input.sourceId,
      instrumentId,
      type,
      effectiveFrom,
      effectiveUntil,
      publishedAt,
      status: normalizeSourceStatus(input.sourceStatus),
      sourceReference: input.sourceReference,
      structuredAttributes: {
        ...(input.attributes ?? {}),
        sourceTaxonomy: input.sourceType,
      },
      revisionId: randomUUID(),
      providerRevision: input.providerRevision,
      supersedesRevisionId: null,
      correctionReason: input.correctionReason ?? null,
      ingestedAt: context.fetchedAt,
      availableAt,
      provenance,
    },
    supersedesProviderRevision: input.supersedesProviderRevision ?? null,
  };
}

export function normalizeShortSellingActivity(
  input: ProviderShortSellingActivity,
  context: MarketStructureNormalizationContext,
): NormalizedShortSellingActivity {
  const availableAt = instant(input.availableAt, 'AVAILABLE_AT_INVALID');
  const dataCutoff = instant(input.dataCutoff, 'DATA_CUTOFF_INVALID');
  const instrumentId = resolveExternalIdentity(
    context.mappings,
    context.providerId,
    input.externalInstrumentId,
    availableAt,
  );
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(input.tradeDate)) fail('TRADE_DATE_INVALID');
  const quantity = optionalDecimal(input.quantity, false, 'QUANTITY_INVALID');
  const value = optionalDecimal(input.value, false, 'VALUE_INVALID');
  const share = optionalDecimal(input.shareOfTurnover, false, 'SHARE_INVALID');
  if (share !== undefined && Number(share) > 1) fail('SHARE_INVALID');
  if (quantity === undefined && value === undefined && share === undefined)
    fail('SHORT_SELLING_ACTIVITY_EMPTY');
  return {
    activity: {
      activityId: input.sourceId,
      instrumentId,
      tradeDate: input.tradeDate,
      session: input.session ?? null,
      ...(quantity === undefined ? {} : { quantity }),
      ...(value === undefined ? {} : { value }),
      ...(share === undefined ? {} : { shareOfTurnover: share }),
      dataCutoff,
      revisionId: randomUUID(),
      providerRevision: input.providerRevision,
      supersedesRevisionId: null,
      correctionReason: input.correctionReason ?? null,
      ingestedAt: context.fetchedAt,
      availableAt,
      provenance: provenanceFor(input, context, availableAt),
    },
    supersedesProviderRevision: input.supersedesProviderRevision ?? null,
  };
}

export function marketMeasureDedupKey(measure: MarketMeasure): string {
  return [
    measure.provenance.providerId,
    measure.measureId,
    measure.providerRevision ?? 'ORIGINAL',
  ].join(':');
}

export function shortSellingActivityDedupKey(
  activity: ShortSellingActivity,
): string {
  return [
    activity.provenance.providerId,
    activity.activityId,
    activity.providerRevision ?? 'ORIGINAL',
  ].join(':');
}

export function resolveMarketMeasureStatus(
  measure: MarketMeasure,
  at: Date,
):
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CORRECTED'
  | 'SUPERSEDED'
  | 'CANCELLED' {
  if (['CORRECTED', 'SUPERSEDED', 'CANCELLED'].includes(measure.status))
    return measure.status;
  if (at < measure.effectiveFrom) return 'SCHEDULED';
  if (measure.effectiveUntil && at > measure.effectiveUntil) return 'EXPIRED';
  return 'ACTIVE';
}

export function getActiveMarketMeasures(
  measures: readonly MarketMeasure[],
  at: Date,
): readonly MarketMeasure[] {
  const visible = measures.filter((measure) => measure.availableAt <= at);
  const superseded = new Set(
    visible.map((measure) => measure.supersedesRevisionId).filter(Boolean),
  );
  return visible.filter(
    (measure) =>
      !superseded.has(measure.revisionId) &&
      resolveMarketMeasureStatus(measure, at) === 'ACTIVE',
  );
}

export function findOverlappingMarketMeasureRevisions(
  records: readonly NormalizedMarketMeasure[],
): readonly [NormalizedMarketMeasure, NormalizedMarketMeasure][] {
  const conflicts: [NormalizedMarketMeasure, NormalizedMarketMeasure][] = [];
  for (let leftIndex = 0; leftIndex < records.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < records.length;
      rightIndex += 1
    ) {
      const left = records[leftIndex]!;
      const right = records[rightIndex]!;
      if (
        left.measure.provenance.providerId !==
          right.measure.provenance.providerId ||
        left.measure.measureId !== right.measure.measureId ||
        left.supersedesProviderRevision === right.measure.providerRevision ||
        right.supersedesProviderRevision === left.measure.providerRevision
      )
        continue;
      const leftEnd =
        left.measure.effectiveUntil?.getTime() ?? Number.POSITIVE_INFINITY;
      const rightEnd =
        right.measure.effectiveUntil?.getTime() ?? Number.POSITIVE_INFINITY;
      if (
        left.measure.effectiveFrom.getTime() <= rightEnd &&
        right.measure.effectiveFrom.getTime() <= leftEnd
      )
        conflicts.push([left, right]);
    }
  }
  return conflicts;
}

function normalizeSourceStatus(status?: string): MarketMeasure['status'] {
  const normalized = status?.trim().toUpperCase();
  return MARKET_MEASURE_STATUSES.includes(normalized as never)
    ? (normalized as MarketMeasure['status'])
    : 'SCHEDULED';
}

function provenanceFor(
  input: { sourceTimestamp: string; providerRevision: string },
  context: MarketStructureNormalizationContext,
  availableAt: Date,
): DataProvenance {
  return {
    providerId: context.providerId,
    providerDataset: context.providerDataset,
    providerRevision: input.providerRevision,
    sourceTimestamp: instant(input.sourceTimestamp, 'SOURCE_TIMESTAMP_INVALID'),
    ingestedAt: context.fetchedAt,
    availableAt,
    deliveryMode: context.deliveryMode,
    license: context.license,
    quality: context.deliveryMode === 'DELAYED' ? 'DELAYED' : 'COMPLETE',
  };
}

function instant(value: string, code: string): Date {
  const result = new Date(value);
  if (Number.isNaN(result.getTime())) fail(code);
  return result;
}

function optionalDecimal(
  value: string | undefined,
  allowNegative: boolean,
  code: string,
): string | undefined {
  if (value === undefined) return undefined;
  if (!/^-?\d+(?:\.\d+)?$/u.test(value)) fail(code);
  if (!allowNegative && Number(value) < 0) fail(code);
  return value;
}

function fail(code: string): never {
  throw new MarketStructureContractError(code);
}
import { randomUUID } from 'node:crypto';
