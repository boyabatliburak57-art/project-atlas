export const INTELLIGENCE_DOMAINS = [
  'InstrumentDomain',
  'CompanyDomain',
  'InstitutionDomain',
  'MarketEventDomain',
  'CorporateDisclosureDomain',
  'InstitutionalFlowDomain',
  'SettlementDomain',
  'MarketMeasureDomain',
  'CalendarDomain',
  'FundDomain',
  'FundHoldingDomain',
  'AnalystConsensusDomain',
  'DerivativesDomain',
  'OrderBookDomain',
  'DataProvenanceDomain',
  'ProviderCapabilityDomain',
] as const;
export type IntelligenceDomain = (typeof INTELLIGENCE_DOMAINS)[number];

export const INTELLIGENCE_CAPABILITIES = [
  'market.price',
  'market.ohlcv',
  'market.depth',
  'institutional.akd',
  'institutional.moneyFlow',
  'settlement.snapshot',
  'settlement.foreign',
  'disclosure.kap',
  'disclosure.financialResult',
  'disclosure.corporateAction',
  'marketMeasure.vbts',
  'marketMeasure.restrictions',
  'marketMeasure.shortSelling',
  'marketMeasure.history',
  'calendar.economic',
  'calendar.earnings',
  'calendar.dividend',
  'calendar.ipo',
  'calendar.corporate',
  'calendar.viopExpiry',
  'fund.metadata',
  'fund.performance',
  'fund.holdings',
  'analyst.consensus',
  'analyst.targetPrice',
  'derivatives.contracts',
  'derivatives.openInterest',
  'derivatives.basis',
  'derivatives.rollover',
  'derivatives.institutionalFlow',
] as const;
export type IntelligenceCapability = (typeof INTELLIGENCE_CAPABILITIES)[number];

export const PRODUCT_AVAILABILITY_STATES = [
  'SUPPORTED_LIVE',
  'SUPPORTED_DELAYED',
  'PROVIDER_REQUIRED',
  'LICENSE_REQUIRED',
  'EXTERNAL_CONFIGURATION_REQUIRED',
  'NOT_AVAILABLE',
] as const;
export type ProductAvailability = (typeof PRODUCT_AVAILABILITY_STATES)[number];
export const PROVIDER_HEALTH_STATES = [
  'HEALTHY',
  'DEGRADED',
  'STALE',
  'RATE_LIMITED',
  'UNAVAILABLE',
  'AUTH_ERROR',
] as const;
export type ProviderHealthState = (typeof PROVIDER_HEALTH_STATES)[number];

export const DATA_QUALITY_STATES = [
  'COMPLETE',
  'PARTIAL',
  'STALE',
  'DELAYED',
  'UNRESOLVED_IDENTITY',
  'CORRECTED',
  'CONFLICTING_SOURCE',
  'NOT_EVALUABLE',
  'PROVIDER_UNAVAILABLE',
] as const;
export type IntelligenceDataQuality = (typeof DATA_QUALITY_STATES)[number];
export const LICENSE_CLASSES = [
  'INTERNAL_ONLY',
  'DISPLAY_ALLOWED',
  'DELAYED_DISPLAY_ONLY',
  'DERIVED_DISPLAY_ALLOWED',
  'UNKNOWN_REQUIRES_REVIEW',
] as const;
export type LicenseClass = (typeof LICENSE_CLASSES)[number];
export const REDISTRIBUTION_CLASSES = [
  'REDISTRIBUTION_PROHIBITED',
  'EXPORT_PROHIBITED',
  'SHARE_PROHIBITED',
  'DISPLAY_ALLOWED',
] as const;
export type RedistributionClass = (typeof REDISTRIBUTION_CLASSES)[number];
export type DeliveryMode = 'LIVE' | 'DELAYED';

export interface IntelligenceLicensePolicy {
  readonly licenseClass: LicenseClass;
  readonly redistribution: readonly RedistributionClass[];
}
export interface DataProvenance {
  readonly providerId: string;
  readonly providerDataset: string;
  readonly providerRevision: string | null;
  readonly sourceTimestamp: Date;
  readonly ingestedAt: Date;
  readonly availableAt: Date;
  readonly deliveryMode: DeliveryMode;
  readonly license: IntelligenceLicensePolicy;
  readonly quality: IntelligenceDataQuality;
}
export interface ProviderDataEnvelope<Payload> {
  readonly providerId: string;
  readonly capability: IntelligenceCapability;
  readonly sourceReference: string;
  readonly sourceTimestamp: Date;
  readonly fetchedAt: Date;
  readonly providerRevision: string | null;
  readonly deliveryMode: DeliveryMode;
  readonly license: IntelligenceLicensePolicy;
  readonly schemaVersion: string;
  readonly correlationId: string;
  readonly payload: Payload;
}

export type CanonicalEntityType =
  | 'INSTRUMENT'
  | 'COMPANY'
  | 'INSTITUTION'
  | 'FUND'
  | 'DERIVATIVE_CONTRACT';
export type IdentityMappingStatus =
  | 'RESOLVED'
  | 'UNRESOLVED_IDENTITY'
  | 'REVIEW_REQUIRED'
  | 'REJECTED';
export interface ExternalIdentityMapping {
  readonly providerId: string;
  readonly entityType: CanonicalEntityType;
  readonly externalId: string;
  readonly canonicalEntityId: string | null;
  readonly validFrom: Date;
  readonly validTo: Date | null;
  readonly confidence: number | null;
  readonly status: IdentityMappingStatus;
  readonly source: string;
  readonly manualReviewState:
    | 'NOT_REQUIRED'
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED';
}
export type InstitutionType =
  | 'BROKERAGE'
  | 'CUSTODIAN'
  | 'FUND_MANAGER'
  | 'FUND'
  | 'FOREIGN_CUSTODIAN'
  | 'OTHER';
export interface Institution {
  readonly id: string;
  readonly type: InstitutionType;
  readonly canonicalName: string;
  readonly shortName: string | null;
  readonly code: string | null;
  readonly active: boolean;
  readonly validFrom: Date;
  readonly validTo: Date | null;
}
export interface Fund {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly type: string;
  readonly managerInstitutionId: string | null;
  readonly currency: string;
  readonly active: boolean;
  readonly benchmarkId: string | null;
}
export interface DerivativeContract {
  readonly id: string;
  readonly underlyingInstrumentId: string;
  readonly contractCode: string;
  readonly type: 'FUTURE' | 'OPTION';
  readonly expiry: Date;
  readonly multiplier: string;
  readonly currency: string;
  readonly settlementType: 'CASH' | 'PHYSICAL';
  readonly active: boolean;
}

export interface RevisionMetadata {
  readonly revisionId: string;
  readonly providerRevision: string | null;
  readonly supersedesRevisionId: string | null;
  readonly correctionReason: string | null;
  readonly ingestedAt: Date;
  readonly availableAt: Date;
}
export type DisclosureType =
  | 'FINANCIAL_RESULT'
  | 'MATERIAL_EVENT'
  | 'NEW_BUSINESS'
  | 'BUYBACK'
  | 'DIVIDEND'
  | 'CAPITAL_INCREASE'
  | 'CAPITAL_DECREASE'
  | 'SPLIT'
  | 'MERGER'
  | 'ACQUISITION'
  | 'SHARE_TRANSACTION'
  | 'MANAGEMENT_CHANGE'
  | 'IPO'
  | 'GUIDANCE'
  | 'OTHER';
export interface CorporateDisclosure extends RevisionMetadata {
  readonly disclosureId: string;
  readonly externalDisclosureId: string;
  readonly companyId: string | null;
  readonly instrumentIds: readonly string[];
  readonly disclosureType: DisclosureType;
  readonly category: string;
  readonly title: string;
  readonly summary: string | null;
  readonly publishedAt: Date;
  readonly effectiveAt: Date | null;
  readonly reportingPeriod: string | null;
  readonly sourceReference: string;
  readonly attachmentMetadata: readonly Readonly<Record<string, string>>[];
  readonly language: string;
  readonly provenance: DataProvenance;
}
export interface MarketEvent extends RevisionMetadata {
  readonly id: string;
  readonly eventType: string;
  readonly entityType: CanonicalEntityType;
  readonly entityId: string;
  readonly occurredAt: Date | null;
  readonly publishedAt: Date;
  readonly effectiveAt: Date | null;
  readonly sourceReference: string;
  readonly importance: {
    readonly value: number;
    readonly methodologyVersion: string;
  } | null;
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly provenance: DataProvenance;
}
export interface InstitutionalFlowObservation extends RevisionMetadata {
  readonly instrumentId: string;
  readonly institutionId: string;
  readonly tradeDate: string;
  readonly session: string | null;
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
  readonly asOf: Date;
  readonly dataCutoff: Date;
  readonly derivedMetrics: Readonly<Record<string, string>>;
  readonly provenance: DataProvenance;
}
export interface SettlementSnapshot extends RevisionMetadata {
  readonly instrumentId: string;
  readonly institutionId: string;
  readonly tradeDate: string | null;
  readonly settlementDate: string;
  readonly holdingQuantity?: string;
  readonly holdingRatio?: string;
  readonly changeQuantity?: string;
  readonly changeRatio?: string;
  readonly residency: 'FOREIGN' | 'DOMESTIC' | 'UNKNOWN';
  readonly freeFloatRatio?: string;
  readonly dataCutoff: Date;
  readonly provenance: DataProvenance;
}
export type MarketMeasureType =
  | 'SHORT_SELL_RESTRICTION'
  | 'MARGIN_TRADING_RESTRICTION'
  | 'GROSS_SETTLEMENT'
  | 'SINGLE_PRICE'
  | 'ORDER_PACKAGE_MEASURE'
  | 'OTHER_EXCHANGE_MEASURE';
export interface MarketMeasure extends RevisionMetadata {
  readonly measureId: string;
  readonly instrumentId: string;
  readonly type: MarketMeasureType;
  readonly effectiveFrom: Date;
  readonly effectiveUntil: Date | null;
  readonly publishedAt: Date;
  readonly status:
    | 'SCHEDULED'
    | 'ACTIVE'
    | 'EXPIRED'
    | 'CORRECTED'
    | 'SUPERSEDED'
    | 'CANCELLED';
  readonly sourceReference: string;
  readonly structuredAttributes: Readonly<Record<string, unknown>>;
  readonly provenance: DataProvenance;
}
export interface ShortSellingActivity extends RevisionMetadata {
  readonly activityId: string;
  readonly instrumentId: string;
  readonly tradeDate: string;
  readonly session: string | null;
  readonly quantity?: string;
  readonly value?: string;
  readonly shareOfTurnover?: string;
  readonly dataCutoff: Date;
  readonly provenance: DataProvenance;
}
export type CalendarCategory =
  | 'ECONOMIC'
  | 'EARNINGS'
  | 'DIVIDEND'
  | 'IPO'
  | 'CORPORATE'
  | 'VIOP_EXPIRY';
export interface CalendarEvent extends RevisionMetadata {
  readonly id: string;
  readonly category: CalendarCategory;
  readonly title: string;
  readonly timezone: string;
  readonly startsAt: Date;
  readonly endsAt: Date | null;
  readonly entityType: CanonicalEntityType | null;
  readonly entityId: string | null;
  readonly details: Readonly<Record<string, unknown>>;
  readonly provenance: DataProvenance;
}
export interface FundHolding extends RevisionMetadata {
  readonly fundId: string;
  readonly instrumentId: string;
  readonly reportingDate: string;
  readonly quantity?: string;
  readonly value?: string;
  readonly weight?: string;
  readonly publishedAt: Date;
  readonly provenance: DataProvenance;
}
export interface AnalystEstimate extends RevisionMetadata {
  readonly companyId: string;
  readonly analystInstitutionId: string | null;
  readonly metric: 'TARGET_PRICE' | 'RECOMMENDATION' | 'CONSENSUS';
  readonly normalizedValue: string;
  readonly providerLabel: string | null;
  readonly publishedAt: Date;
  readonly horizon: string | null;
  readonly currency: string | null;
  readonly provenance: DataProvenance;
}
export interface DerivativeStatistic {
  readonly contractId: string;
  readonly timestamp: Date;
  readonly metric:
    | 'PRICE'
    | 'VOLUME'
    | 'OPEN_INTEREST'
    | 'BASIS'
    | 'ROLLOVER'
    | 'INSTITUTIONAL_FLOW';
  readonly value: string;
  readonly dataCutoff: Date;
  readonly provenance: DataProvenance;
}
export interface OrderBookLevel {
  readonly instrumentId: string;
  readonly timestamp: Date;
  readonly side: 'BID' | 'ASK';
  readonly level: number;
  readonly price: string;
  readonly quantity: string;
  readonly orderCount?: number;
  readonly provenance: DataProvenance;
}

export interface IntelligenceResponseMetadata {
  readonly asOf: string;
  readonly dataCutoff: string;
  readonly provider: string;
  readonly deliveryMode: DeliveryMode;
  readonly freshness: IntelligenceDataQuality;
  readonly coverage: 'FULL' | 'PARTIAL' | 'NONE';
  readonly quality: IntelligenceDataQuality;
  readonly methodologyVersion: string | null;
  readonly license: IntelligenceLicensePolicy;
  readonly capability: {
    readonly id: IntelligenceCapability;
    readonly availability: ProductAvailability;
  };
}
export type IntelligenceErrorReason =
  | 'PROVIDER_REQUIRED'
  | 'LICENSE_REQUIRED'
  | 'CAPABILITY_UNAVAILABLE'
  | 'PROVIDER_UNAVAILABLE'
  | 'DATA_DELAYED'
  | 'DATA_STALE'
  | 'PARTIAL_COVERAGE'
  | 'UNRESOLVED_IDENTITY'
  | 'SOURCE_CONFLICT'
  | 'DATE_RANGE_TOO_LARGE'
  | 'NOT_EVALUABLE';

export interface ProviderCapabilityDecision {
  readonly providerId: string | null;
  readonly capability: IntelligenceCapability;
  readonly availability: ProductAvailability;
  readonly health: ProviderHealthState;
  readonly checkedAt: Date;
}
export interface IntelligenceQuery {
  readonly cursor?: string;
  readonly pageSize?: number;
  readonly from?: Date;
  readonly to?: Date;
  readonly filters?: Readonly<Record<string, string>>;
}
export interface IntelligenceIngestionJob {
  readonly type:
    | 'DISCLOSURE_SYNC'
    | 'INSTITUTIONAL_FLOW_SYNC'
    | 'SETTLEMENT_SYNC'
    | 'MARKET_MEASURE_SYNC'
    | 'CALENDAR_SYNC'
    | 'FUND_SYNC'
    | 'ANALYST_SYNC'
    | 'DERIVATIVES_SYNC';
  readonly providerId: string;
  readonly capability: IntelligenceCapability;
  readonly from: Date;
  readonly to: Date;
  readonly checkpoint: string | null;
  readonly correlationId: string;
}

export interface DisclosureProvider {
  fetchDisclosures(
    query: IntelligenceQuery,
  ): Promise<readonly ProviderDataEnvelope<unknown>[]>;
}
export interface InstitutionalFlowProvider {
  fetchInstitutionalFlows(
    query: IntelligenceQuery,
  ): Promise<readonly ProviderDataEnvelope<unknown>[]>;
}
export interface SettlementProvider {
  fetchSettlements(
    query: IntelligenceQuery,
  ): Promise<readonly ProviderDataEnvelope<unknown>[]>;
}
export interface MarketMeasureProvider {
  fetchMarketMeasures(
    query: IntelligenceQuery,
  ): Promise<readonly ProviderDataEnvelope<unknown>[]>;
}
export interface ShortSellingActivityProvider {
  fetchShortSellingActivity(
    query: IntelligenceQuery,
  ): Promise<readonly ProviderDataEnvelope<unknown>[]>;
}
export interface CalendarProvider {
  fetchCalendar(
    query: IntelligenceQuery,
  ): Promise<readonly ProviderDataEnvelope<unknown>[]>;
}
export interface FundProvider {
  fetchFunds(
    query: IntelligenceQuery,
  ): Promise<readonly ProviderDataEnvelope<unknown>[]>;
}
export interface AnalystProvider {
  fetchAnalystData(
    query: IntelligenceQuery,
  ): Promise<readonly ProviderDataEnvelope<unknown>[]>;
}
export interface DerivativesProvider {
  fetchDerivatives(
    query: IntelligenceQuery,
  ): Promise<readonly ProviderDataEnvelope<unknown>[]>;
}
export interface OrderBookProvider {
  subscribeOrderBook(
    instrumentIds: readonly string[],
  ): AsyncIterable<ProviderDataEnvelope<unknown>>;
}

export const SCANNER_INTELLIGENCE_FIELD_FAMILIES = [
  'TECHNICAL',
  'FUNDAMENTAL',
  'INSTITUTIONAL',
  'SETTLEMENT',
  'EVENT',
  'MARKET_STRUCTURE',
  'FUND',
  'DERIVATIVES',
] as const;
export type ScannerIntelligenceFieldFamily =
  (typeof SCANNER_INTELLIGENCE_FIELD_FAMILIES)[number];
export interface TimelineProjectionSource {
  readonly domain: IntelligenceDomain;
  readonly availableAtField: 'availableAt';
  readonly entityKey: string;
}
export interface CompareMetricDefinition {
  readonly id: string;
  readonly domain: IntelligenceDomain;
  readonly methodologyVersion: string;
  readonly unit: string;
}
export interface DerivedFinding {
  readonly findingType: string;
  readonly entityType: CanonicalEntityType;
  readonly entityId: string;
  readonly observedAt: Date;
  readonly baselineWindow: string;
  readonly observedValue: string;
  readonly referenceValue: string | null;
  readonly magnitude: string | null;
  readonly methodologyVersion: string;
  readonly inputDataCutoff: Date;
  readonly sourceCapabilities: readonly IntelligenceCapability[];
  readonly status: 'ACTIVE' | 'RESOLVED' | 'RETRACTED';
}
