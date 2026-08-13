import type {
  CorporateDisclosure,
  ExternalIdentityMapping,
  IntelligenceIngestionJob,
  IntelligenceLicensePolicy,
  IntelligenceQuery,
  MarketEvent,
  ProviderCapabilityDecision,
  RevisionMetadata,
} from './contracts.js';

export class IntelligenceContractError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = 'IntelligenceContractError';
  }
}

export function resolveExternalIdentity(
  mappings: readonly ExternalIdentityMapping[],
  providerId: string,
  externalId: string,
  at: Date,
): string {
  const match = mappings.find(
    (item) =>
      item.providerId === providerId &&
      item.externalId === externalId &&
      item.status === 'RESOLVED' &&
      item.canonicalEntityId !== null &&
      item.validFrom <= at &&
      (item.validTo === null || item.validTo >= at),
  );
  if (!match?.canonicalEntityId)
    throw new IntelligenceContractError('UNRESOLVED_IDENTITY');
  return match.canonicalEntityId;
}

export function canDeliver(
  policy: IntelligenceLicensePolicy,
  operation: 'DISPLAY' | 'EXPORT' | 'SHARE' | 'REDISTRIBUTE',
  mode: 'LIVE' | 'DELAYED',
): boolean {
  if (
    policy.licenseClass === 'UNKNOWN_REQUIRES_REVIEW' ||
    policy.licenseClass === 'INTERNAL_ONLY'
  )
    return false;
  if (
    policy.licenseClass === 'DELAYED_DISPLAY_ONLY' &&
    (operation !== 'DISPLAY' || mode !== 'DELAYED')
  )
    return false;
  if (
    operation === 'EXPORT' &&
    policy.redistribution.includes('EXPORT_PROHIBITED')
  )
    return false;
  if (
    operation === 'SHARE' &&
    policy.redistribution.includes('SHARE_PROHIBITED')
  )
    return false;
  if (
    operation === 'REDISTRIBUTE' &&
    policy.redistribution.includes('REDISTRIBUTION_PROHIBITED')
  )
    return false;
  return (
    operation === 'DISPLAY' || policy.redistribution.includes('DISPLAY_ALLOWED')
  );
}

export function assertCapabilityUsable(
  decision: ProviderCapabilityDecision,
): void {
  if (!['SUPPORTED_LIVE', 'SUPPORTED_DELAYED'].includes(decision.availability))
    throw new IntelligenceContractError(decision.availability);
  if (!['HEALTHY', 'DEGRADED'].includes(decision.health))
    throw new IntelligenceContractError('PROVIDER_UNAVAILABLE');
}

export function assertTemporalAvailability(record: {
  readonly availableAt: Date;
  readonly publishedAt?: Date;
  readonly ingestedAt?: Date;
}): void {
  if (record.publishedAt && record.availableAt < record.publishedAt)
    throw new IntelligenceContractError('AVAILABLE_BEFORE_PUBLICATION');
  if (record.ingestedAt && record.availableAt > record.ingestedAt)
    throw new IntelligenceContractError('AVAILABLE_AFTER_INGESTION');
}
export function visibleAt<T extends { readonly availableAt: Date }>(
  records: readonly T[],
  cutoff: Date,
): readonly T[] {
  return records.filter((record) => record.availableAt <= cutoff);
}

export function assertRevisionChain(
  revisions: readonly RevisionMetadata[],
): void {
  const ids = new Set(revisions.map((item) => item.revisionId));
  if (ids.size !== revisions.length)
    throw new IntelligenceContractError('DUPLICATE_REVISION');
  for (const revision of revisions)
    if (
      revision.supersedesRevisionId &&
      !ids.has(revision.supersedesRevisionId)
    )
      throw new IntelligenceContractError('MISSING_SUPERSEDED_REVISION');
}

export function disclosureDedupKey(value: CorporateDisclosure): string {
  return `${value.provenance.providerId}:${value.externalDisclosureId}:${value.providerRevision ?? value.revisionId}`;
}
export function institutionalFlowDedupKey(value: {
  provenance: { providerId: string };
  instrumentId: string;
  institutionId: string;
  tradeDate: string;
  session: string | null;
  providerRevision: string | null;
  revisionId: string;
}): string {
  return `${value.provenance.providerId}:${value.instrumentId}:${value.institutionId}:${value.tradeDate}:${value.session ?? 'ALL'}:${value.providerRevision ?? value.revisionId}`;
}
export function settlementDedupKey(value: {
  provenance: { providerId: string };
  instrumentId: string;
  institutionId: string;
  settlementDate: string;
  providerRevision: string | null;
  revisionId: string;
}): string {
  return `${value.provenance.providerId}:${value.instrumentId}:${value.institutionId}:${value.settlementDate}:${value.providerRevision ?? value.revisionId}`;
}

export function normalizeDisclosureToEvent(
  disclosure: CorporateDisclosure,
): MarketEvent {
  assertTemporalAvailability(disclosure);
  const entityId = disclosure.companyId ?? disclosure.instrumentIds[0];
  if (!entityId) throw new IntelligenceContractError('UNRESOLVED_IDENTITY');
  return {
    id: `disclosure:${disclosure.disclosureId}:${disclosure.revisionId}`,
    eventType: disclosure.disclosureType,
    entityType: disclosure.companyId ? 'COMPANY' : 'INSTRUMENT',
    entityId,
    occurredAt: disclosure.effectiveAt,
    publishedAt: disclosure.publishedAt,
    effectiveAt: disclosure.effectiveAt,
    sourceReference: disclosure.sourceReference,
    importance: null,
    attributes: {
      disclosureId: disclosure.disclosureId,
      category: disclosure.category,
    },
    revisionId: disclosure.revisionId,
    providerRevision: disclosure.providerRevision,
    supersedesRevisionId: disclosure.supersedesRevisionId,
    correctionReason: disclosure.correctionReason,
    ingestedAt: disclosure.ingestedAt,
    availableAt: disclosure.availableAt,
    provenance: disclosure.provenance,
  };
}

export function validateIntelligenceQuery(
  query: IntelligenceQuery,
  options: {
    readonly maxPageSize?: number;
    readonly maxRangeDays?: number;
    readonly allowedFilters?: readonly string[];
  } = {},
): Required<Pick<IntelligenceQuery, 'pageSize'>> & IntelligenceQuery {
  const pageSize = query.pageSize ?? 50;
  if (pageSize < 1 || pageSize > (options.maxPageSize ?? 200))
    throw new IntelligenceContractError('PAGE_SIZE_OUT_OF_RANGE');
  if (query.from && query.to) {
    if (query.to < query.from)
      throw new IntelligenceContractError('INVALID_DATE_RANGE');
    if (
      (query.to.getTime() - query.from.getTime()) / 86_400_000 >
      (options.maxRangeDays ?? 366)
    )
      throw new IntelligenceContractError('DATE_RANGE_TOO_LARGE');
  }
  const allowed = new Set(options.allowedFilters ?? []);
  for (const key of Object.keys(query.filters ?? {}))
    if (!allowed.has(key))
      throw new IntelligenceContractError('FILTER_NOT_ALLOWED');
  return { ...query, pageSize };
}

export function assertIngestionJob(job: IntelligenceIngestionJob): void {
  if (job.to < job.from)
    throw new IntelligenceContractError('INVALID_DATE_RANGE');
  if (!job.correlationId || !job.providerId)
    throw new IntelligenceContractError('INVALID_JOB');
}

export function assertFixturesAllowed(
  environment: 'development' | 'test' | 'production',
): void {
  if (environment === 'production')
    throw new IntelligenceContractError('FIXTURES_PRODUCTION_FORBIDDEN');
}

export function publicProviderEnvelope<T>(envelope: {
  readonly payload: T;
  readonly providerId: string;
  readonly capability: string;
  readonly sourceReference: string;
  readonly sourceTimestamp: Date;
  readonly fetchedAt: Date;
  readonly providerRevision: string | null;
  readonly deliveryMode: string;
  readonly license: IntelligenceLicensePolicy;
  readonly schemaVersion: string;
  readonly correlationId: string;
}): Omit<typeof envelope, 'payload'> {
  return {
    providerId: envelope.providerId,
    capability: envelope.capability,
    sourceReference: envelope.sourceReference,
    sourceTimestamp: envelope.sourceTimestamp,
    fetchedAt: envelope.fetchedAt,
    providerRevision: envelope.providerRevision,
    deliveryMode: envelope.deliveryMode,
    license: envelope.license,
    schemaVersion: envelope.schemaVersion,
    correlationId: envelope.correlationId,
  };
}
