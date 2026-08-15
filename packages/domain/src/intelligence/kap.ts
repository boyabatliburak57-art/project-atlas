import { createHash } from 'node:crypto';

import type {
  CorporateDisclosure,
  DataProvenance,
  DisclosureType,
  ExternalIdentityMapping,
  IntelligenceLicensePolicy,
  MarketEvent,
} from './contracts.js';
import {
  IntelligenceContractError,
  normalizeDisclosureToEvent,
  resolveExternalIdentity,
} from './policies.js';

export const DISCLOSURE_STATES = [
  'ACTIVE',
  'CORRECTED',
  'SUPERSEDED',
  'WITHDRAWN',
] as const;
export type DisclosureState = (typeof DISCLOSURE_STATES)[number];

export interface KapProviderAttachment {
  readonly title: string;
  readonly mimeType: string | null;
  readonly sizeBytes: number | null;
  readonly sourceUrl: string;
}

export interface KapProviderDisclosure {
  readonly externalDisclosureId: string;
  readonly providerRevision: string;
  readonly supersedesProviderRevision: string | null;
  readonly state: DisclosureState;
  readonly sourceCategory: string;
  readonly title: string;
  readonly sourceSummary: string | null;
  readonly companyExternalIds: readonly string[];
  readonly instrumentExternalIds: readonly string[];
  readonly publishedAt: string;
  readonly effectiveAt: string | null;
  readonly reportingPeriod: string | null;
  readonly sourceTimestamp: string;
  readonly availableAt: string;
  readonly sourceUrl: string;
  readonly language: string;
  readonly structuredAttributes: Readonly<Record<string, unknown>>;
  readonly attachments: readonly KapProviderAttachment[];
}

export interface KapClassification {
  readonly type: DisclosureType;
  readonly sourceCategory: string;
  readonly confidence: 'SOURCE_STRUCTURED' | 'DETERMINISTIC_RULE' | 'FALLBACK';
  readonly methodologyVersion: 'kap-classification-v1';
}

const STRUCTURED_CATEGORY_MAP: Readonly<Record<string, DisclosureType>> = {
  FINANCIAL_STATEMENT: 'FINANCIAL_RESULT',
  MATERIAL_DISCLOSURE: 'MATERIAL_EVENT',
  NEW_BUSINESS_RELATIONSHIP: 'NEW_BUSINESS',
  SHARE_BUYBACK: 'BUYBACK',
  DIVIDEND: 'DIVIDEND',
  CAPITAL_INCREASE: 'CAPITAL_INCREASE',
  CAPITAL_DECREASE: 'CAPITAL_DECREASE',
  SHARE_SPLIT: 'SPLIT',
  MERGER: 'MERGER',
  ACQUISITION: 'ACQUISITION',
  SHARE_TRANSACTION: 'SHARE_TRANSACTION',
  MANAGEMENT_CHANGE: 'MANAGEMENT_CHANGE',
  PUBLIC_OFFERING: 'IPO',
  GUIDANCE: 'GUIDANCE',
};

const TITLE_RULES: readonly [RegExp, DisclosureType][] = [
  [/finansal rapor|finansal tablo|faaliyet raporu/iu, 'FINANCIAL_RESULT'],
  [/yeni iş ilişkisi|sözleşme imzalan/iu, 'NEW_BUSINESS'],
  [/pay geri alım|geri alım program/iu, 'BUYBACK'],
  [/kar payı|temettü/iu, 'DIVIDEND'],
  [/sermaye artırım/iu, 'CAPITAL_INCREASE'],
  [/sermaye azaltım/iu, 'CAPITAL_DECREASE'],
  [/pay bölün/iu, 'SPLIT'],
  [/birleşme/iu, 'MERGER'],
  [/devralma|satın alma/iu, 'ACQUISITION'],
  [/halka arz/iu, 'IPO'],
];

export function classifyKapDisclosure(
  sourceCategory: string,
  title: string,
): KapClassification {
  const normalized = sourceCategory
    .trim()
    .toUpperCase()
    .replaceAll(/[^A-Z0-9]+/gu, '_');
  const structured = STRUCTURED_CATEGORY_MAP[normalized];
  if (structured)
    return {
      type: structured,
      sourceCategory,
      confidence: 'SOURCE_STRUCTURED',
      methodologyVersion: 'kap-classification-v1',
    };
  const rule = TITLE_RULES.find(([pattern]) => pattern.test(title));
  return {
    type: rule?.[1] ?? 'OTHER',
    sourceCategory,
    confidence: rule ? 'DETERMINISTIC_RULE' : 'FALLBACK',
    methodologyVersion: 'kap-classification-v1',
  };
}

export interface KapNormalizationContext {
  readonly providerId: string;
  readonly providerDataset: string;
  readonly deliveryMode: 'LIVE' | 'DELAYED';
  readonly license: IntelligenceLicensePolicy;
  readonly fetchedAt: Date;
  readonly mappings: readonly ExternalIdentityMapping[];
  readonly allowedSourceHosts: ReadonlySet<string>;
}

export interface NormalizedKapDisclosure {
  readonly disclosure: CorporateDisclosure;
  readonly event: MarketEvent;
  readonly state: DisclosureState;
  readonly companyIds: readonly string[];
  readonly instrumentIds: readonly string[];
  readonly sourceCategory: string;
  readonly classification: KapClassification;
  readonly supersedesProviderRevision: string | null;
  readonly chainStatus: 'COMPLETE' | 'AWAITING_PREVIOUS_REVISION';
}

export function normalizeKapDisclosure(
  input: KapProviderDisclosure,
  context: KapNormalizationContext,
): NormalizedKapDisclosure {
  validateKapProviderDisclosure(input, context.allowedSourceHosts);
  const publishedAt = new Date(input.publishedAt);
  const availableAt = new Date(input.availableAt);
  const sourceTimestamp = new Date(input.sourceTimestamp);
  const companyIds = resolveMany(
    context.mappings,
    context.providerId,
    input.companyExternalIds,
    'COMPANY',
    availableAt,
  );
  const instrumentIds = resolveMany(
    context.mappings,
    context.providerId,
    input.instrumentExternalIds,
    'INSTRUMENT',
    availableAt,
  );
  if (companyIds.length === 0 && instrumentIds.length === 0)
    throw new IntelligenceContractError('UNRESOLVED_IDENTITY');
  const classification = classifyKapDisclosure(
    input.sourceCategory,
    input.title,
  );
  const revisionId = stableUuid(
    `${context.providerId}:${input.externalDisclosureId}:${input.providerRevision}`,
  );
  const provenance: DataProvenance = {
    providerId: context.providerId,
    providerDataset: context.providerDataset,
    providerRevision: input.providerRevision,
    sourceTimestamp,
    ingestedAt: context.fetchedAt,
    availableAt,
    deliveryMode: context.deliveryMode,
    license: context.license,
    quality: context.deliveryMode === 'DELAYED' ? 'DELAYED' : 'COMPLETE',
  };
  const safeAttributes = normalizeStructuredAttributes(
    classification.type,
    input.structuredAttributes,
  );
  const disclosure: CorporateDisclosure = {
    disclosureId: stableUuid(
      `${context.providerId}:${input.externalDisclosureId}`,
    ),
    externalDisclosureId: input.externalDisclosureId,
    companyId: companyIds[0] ?? null,
    instrumentIds,
    disclosureType: classification.type,
    category: classification.type,
    title: normalizePlainText(input.title),
    summary: input.sourceSummary
      ? normalizePlainText(input.sourceSummary)
      : null,
    publishedAt,
    effectiveAt: input.effectiveAt ? new Date(input.effectiveAt) : null,
    reportingPeriod: input.reportingPeriod,
    sourceReference: validateExternalSourceUrl(
      input.sourceUrl,
      context.allowedSourceHosts,
    ),
    attachmentMetadata: input.attachments.map((attachment) => ({
      title: normalizePlainText(attachment.title),
      mimeType: attachment.mimeType ?? '',
      sizeBytes:
        attachment.sizeBytes === null ? '' : String(attachment.sizeBytes),
      sourceReference: validateExternalSourceUrl(
        attachment.sourceUrl,
        context.allowedSourceHosts,
      ),
    })),
    language: input.language,
    revisionId,
    providerRevision: input.providerRevision,
    supersedesRevisionId: null,
    correctionReason:
      input.state === 'CORRECTED' ? 'PROVIDER_CORRECTION' : null,
    ingestedAt: context.fetchedAt,
    availableAt,
    provenance,
  };
  const baseEvent = normalizeDisclosureToEvent(disclosure);
  const event: MarketEvent = {
    ...baseEvent,
    entityType: companyIds.length > 0 ? 'COMPANY' : 'INSTRUMENT',
    entityId: companyIds[0] ?? instrumentIds[0]!,
    attributes: {
      sourceDisclosureId: disclosure.disclosureId,
      sourceRevisionId: revisionId,
      sourceCategory: input.sourceCategory,
      classificationConfidence: classification.confidence,
      classificationMethodologyVersion: classification.methodologyVersion,
      companyIds,
      instrumentIds,
      disclosureState: input.state,
      supersedesProviderRevision: input.supersedesProviderRevision,
      reportingPeriod: input.reportingPeriod,
      attachments: disclosure.attachmentMetadata,
      ...safeAttributes,
    },
  };
  return {
    disclosure,
    event,
    state: input.state,
    companyIds,
    instrumentIds,
    sourceCategory: input.sourceCategory,
    classification,
    supersedesProviderRevision: input.supersedesProviderRevision,
    chainStatus: input.supersedesProviderRevision
      ? 'AWAITING_PREVIOUS_REVISION'
      : 'COMPLETE',
  };
}

export function validateKapProviderDisclosure(
  input: KapProviderDisclosure,
  allowedHosts: ReadonlySet<string>,
): void {
  if (!input.externalDisclosureId.trim() || !input.providerRevision.trim())
    throw new IntelligenceContractError('INVALID_DISCLOSURE_IDENTITY');
  if (!input.title.trim() || input.title.length > 2_000)
    throw new IntelligenceContractError('INVALID_DISCLOSURE_TITLE');
  for (const value of [
    input.publishedAt,
    input.availableAt,
    input.sourceTimestamp,
  ])
    if (!Number.isFinite(new Date(value).getTime()))
      throw new IntelligenceContractError('INVALID_DISCLOSURE_TIME');
  if (new Date(input.availableAt) < new Date(input.publishedAt))
    throw new IntelligenceContractError('AVAILABLE_BEFORE_PUBLICATION');
  validateExternalSourceUrl(input.sourceUrl, allowedHosts);
  for (const attachment of input.attachments)
    validateExternalSourceUrl(attachment.sourceUrl, allowedHosts);
}

export function validateExternalSourceUrl(
  value: string,
  allowedHosts: ReadonlySet<string>,
): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new IntelligenceContractError('INVALID_SOURCE_URL');
  }
  if (
    url.protocol !== 'https:' ||
    !allowedHosts.has(url.hostname.toLowerCase())
  )
    throw new IntelligenceContractError('INVALID_SOURCE_URL');
  if (url.username || url.password)
    throw new IntelligenceContractError('SOURCE_URL_CREDENTIALS_FORBIDDEN');
  return url.toString();
}

export function normalizeKapSearch(value: string): string {
  const normalized = normalizePlainText(value).normalize('NFKC').trim();
  if (normalized.length < 2 || normalized.length > 80)
    throw new IntelligenceContractError('INVALID_SEARCH_QUERY');
  return normalized;
}

export type EventRelevance =
  | 'WATCHLIST_RELEVANT'
  | 'PORTFOLIO_RELEVANT'
  | 'BOTH'
  | 'NONE';

/** Shared-event reference only: notification/read state stays user-private. */
export interface SmartInboxMarketEventReference {
  readonly marketEventId: string;
  readonly userId: string;
  readonly relevance: Exclude<EventRelevance, 'NONE'>;
  readonly readAt: Date | null;
}

/** Candidate consumed by the existing alert evaluation boundary in TASK-110N. */
export interface MarketEventAlertCandidate {
  readonly marketEventId: string;
  readonly eventType: DisclosureType;
  readonly companyIds: readonly string[];
  readonly instrumentIds: readonly string[];
  readonly availableAt: Date;
  readonly dataCutoff: Date;
}

export function toMarketEventAlertCandidate(
  record: NormalizedKapDisclosure,
): MarketEventAlertCandidate {
  return {
    marketEventId: record.event.id,
    eventType: record.disclosure.disclosureType,
    companyIds: record.companyIds,
    instrumentIds: record.instrumentIds,
    availableAt: record.event.availableAt,
    dataCutoff: record.event.provenance.sourceTimestamp,
  };
}

export function eventRelevance(
  eventInstrumentIds: readonly string[],
  watchlistInstrumentIds: ReadonlySet<string>,
  portfolioInstrumentIds: ReadonlySet<string>,
): EventRelevance {
  const watchlist = eventInstrumentIds.some((id) =>
    watchlistInstrumentIds.has(id),
  );
  const portfolio = eventInstrumentIds.some((id) =>
    portfolioInstrumentIds.has(id),
  );
  return watchlist && portfolio
    ? 'BOTH'
    : watchlist
      ? 'WATCHLIST_RELEVANT'
      : portfolio
        ? 'PORTFOLIO_RELEVANT'
        : 'NONE';
}

function resolveMany(
  mappings: readonly ExternalIdentityMapping[],
  providerId: string,
  externalIds: readonly string[],
  entityType: 'COMPANY' | 'INSTRUMENT',
  at: Date,
): readonly string[] {
  return [
    ...new Set(
      externalIds.map((externalId) => {
        const scoped = mappings.filter(
          (mapping) => mapping.entityType === entityType,
        );
        return resolveExternalIdentity(scoped, providerId, externalId, at);
      }),
    ),
  ];
}

function normalizeStructuredAttributes(
  type: DisclosureType,
  attributes: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  const allowedByType: Readonly<Record<DisclosureType, readonly string[]>> = {
    FINANCIAL_RESULT: ['fiscalYear', 'fiscalPeriod'],
    NEW_BUSINESS: [
      'counterparty',
      'contractAmount',
      'currency',
      'duration',
      'materialitySource',
    ],
    BUYBACK: ['buybackStage'],
    DIVIDEND: [
      'decisionState',
      'grossAmount',
      'netAmount',
      'currency',
      'recordDate',
      'exDate',
      'paymentDate',
    ],
    CAPITAL_INCREASE: ['decisionState', 'effectiveDate'],
    CAPITAL_DECREASE: ['decisionState', 'effectiveDate'],
    SPLIT: ['decisionState', 'effectiveDate'],
    MERGER: ['decisionState', 'effectiveDate'],
    ACQUISITION: ['decisionState', 'effectiveDate'],
    IPO: ['decisionState', 'effectiveDate'],
    MATERIAL_EVENT: [],
    SHARE_TRANSACTION: [],
    MANAGEMENT_CHANGE: [],
    GUIDANCE: [],
    OTHER: [],
  };
  return Object.fromEntries(
    (allowedByType[type] ?? []).flatMap((key) =>
      attributes[key] === undefined ? [] : [[key, attributes[key]]],
    ),
  );
}

function normalizePlainText(value: string): string {
  return value
    .replaceAll(/<[^>]*>/gu, ' ')
    .replaceAll(/\s+/gu, ' ')
    .trim();
}

function stableUuid(value: string): string {
  const hash = createHash('sha256').update(value).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
