import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { dataProviders, instruments } from './instrument-master';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
};
const provenance = {
  providerId: uuid('provider_id')
    .notNull()
    .references(() => dataProviders.id, { onDelete: 'restrict' }),
  providerDataset: varchar('provider_dataset', { length: 128 }).notNull(),
  providerRevision: varchar('provider_revision', { length: 128 }),
  sourceTimestamp: timestamp('source_timestamp', {
    withTimezone: true,
  }).notNull(),
  ingestedAt: timestamp('ingested_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  availableAt: timestamp('available_at', { withTimezone: true }).notNull(),
  deliveryMode: varchar('delivery_mode', { length: 16 }).notNull(),
  licenseClass: varchar('license_class', { length: 40 }).notNull(),
  redistributionClasses: jsonb('redistribution_classes')
    .$type<readonly string[]>()
    .default([])
    .notNull(),
  qualityState: varchar('quality_state', { length: 32 }).notNull(),
};
const revision = {
  revisionId: uuid('revision_id').defaultRandom().primaryKey(),
  supersedesRevisionId: uuid('supersedes_revision_id'),
  correctionReason: text('correction_reason'),
};

export const intelligenceInstitutions = pgTable(
  'intelligence_institutions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    type: varchar('type', { length: 32 }).notNull(),
    canonicalName: varchar('canonical_name', { length: 255 }).notNull(),
    shortName: varchar('short_name', { length: 128 }),
    code: varchar('code', { length: 64 }),
    active: boolean('active').default(true).notNull(),
    validFrom: date('valid_from').notNull(),
    validTo: date('valid_to'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('intelligence_institutions_code_unique')
      .on(t.code)
      .where(sql`${t.code} is not null`),
    check(
      'intelligence_institutions_type_check',
      sql`${t.type} in ('BROKERAGE','CUSTODIAN','FUND_MANAGER','FUND','FOREIGN_CUSTODIAN','OTHER')`,
    ),
    check(
      'intelligence_institutions_validity_check',
      sql`${t.validTo} is null or ${t.validTo} >= ${t.validFrom}`,
    ),
  ],
);

export const intelligenceCompanies = pgTable(
  'intelligence_companies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    canonicalName: varchar('canonical_name', { length: 255 }).notNull(),
    primaryInstrumentId: uuid('primary_instrument_id').references(
      () => instruments.id,
      { onDelete: 'set null' },
    ),
    active: boolean('active').default(true).notNull(),
    ...timestamps,
  },
  (t) => [
    index('intelligence_companies_instrument_idx').on(t.primaryInstrumentId),
  ],
);

export const intelligenceFunds = pgTable(
  'intelligence_funds',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 64 }).notNull(),
    type: varchar('type', { length: 64 }).notNull(),
    managerInstitutionId: uuid('manager_institution_id').references(
      () => intelligenceInstitutions.id,
      { onDelete: 'set null' },
    ),
    currency: varchar('currency', { length: 3 }).notNull(),
    active: boolean('active').default(true).notNull(),
    benchmarkId: uuid('benchmark_id').references(() => instruments.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('intelligence_funds_code_unique').on(t.code),
    index('intelligence_funds_manager_idx').on(t.managerInstitutionId),
  ],
);

export const derivativeContracts = pgTable(
  'derivative_contracts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    underlyingInstrumentId: uuid('underlying_instrument_id')
      .notNull()
      .references(() => instruments.id, { onDelete: 'restrict' }),
    contractCode: varchar('contract_code', { length: 96 }).notNull(),
    type: varchar('type', { length: 16 }).notNull(),
    expiry: timestamp('expiry', { withTimezone: true }).notNull(),
    multiplier: numeric('multiplier', { precision: 28, scale: 10 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    settlementType: varchar('settlement_type', { length: 16 }).notNull(),
    active: boolean('active').default(true).notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('derivative_contracts_code_expiry_unique').on(
      t.contractCode,
      t.expiry,
    ),
    index('derivative_contracts_underlying_expiry_idx').on(
      t.underlyingInstrumentId,
      t.expiry,
    ),
    check(
      'derivative_contracts_type_check',
      sql`${t.type} in ('FUTURE','OPTION')`,
    ),
  ],
);

export const intelligenceExternalIdentityMappings = pgTable(
  'intelligence_external_identity_mappings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => dataProviders.id, { onDelete: 'restrict' }),
    entityType: varchar('entity_type', { length: 32 }).notNull(),
    externalId: varchar('external_id', { length: 255 }).notNull(),
    canonicalEntityId: uuid('canonical_entity_id'),
    validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
    validTo: timestamp('valid_to', { withTimezone: true }),
    confidence: numeric('confidence', { precision: 5, scale: 4 }),
    status: varchar('status', { length: 32 }).notNull(),
    source: varchar('source', { length: 128 }).notNull(),
    manualReviewState: varchar('manual_review_state', { length: 24 }).notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('intelligence_external_identity_period_unique').on(
      t.providerId,
      t.entityType,
      t.externalId,
      t.validFrom,
    ),
    index('intelligence_external_identity_canonical_idx').on(
      t.entityType,
      t.canonicalEntityId,
    ),
    check(
      'intelligence_external_identity_resolution_check',
      sql`(${t.status} = 'RESOLVED' and ${t.canonicalEntityId} is not null) or (${t.status} <> 'RESOLVED')`,
    ),
    check(
      'intelligence_external_identity_validity_check',
      sql`${t.validTo} is null or ${t.validTo} >= ${t.validFrom}`,
    ),
  ],
);

export const intelligenceProviderCapabilities = pgTable(
  'intelligence_provider_capabilities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerId: uuid('provider_id').references(() => dataProviders.id, {
      onDelete: 'cascade',
    }),
    capability: varchar('capability', { length: 96 }).notNull(),
    availability: varchar('availability', { length: 40 }).notNull(),
    health: varchar('health', { length: 24 }).notNull(),
    expectedRefreshCadenceSeconds: numeric('expected_refresh_cadence_seconds', {
      precision: 12,
      scale: 0,
    }),
    staleAfterSeconds: numeric('stale_after_seconds', {
      precision: 12,
      scale: 0,
    }),
    hardExpireAfterSeconds: numeric('hard_expire_after_seconds', {
      precision: 12,
      scale: 0,
    }),
    delayedBySeconds: numeric('delayed_by_seconds', {
      precision: 12,
      scale: 0,
    }),
    checkedAt: timestamp('checked_at', { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('intelligence_provider_capability_unique').on(
      t.providerId,
      t.capability,
    ),
    index('intelligence_provider_capability_state_idx').on(
      t.capability,
      t.availability,
      t.health,
    ),
  ],
);

export const corporateDisclosureRevisions = pgTable(
  'corporate_disclosure_revisions',
  {
    ...revision,
    disclosureId: uuid('disclosure_id').notNull(),
    externalDisclosureId: varchar('external_disclosure_id', {
      length: 255,
    }).notNull(),
    companyId: uuid('company_id').references(() => intelligenceCompanies.id, {
      onDelete: 'set null',
    }),
    disclosureType: varchar('disclosure_type', { length: 40 }).notNull(),
    state: varchar('state', { length: 24 }).default('ACTIVE').notNull(),
    category: varchar('category', { length: 128 }).notNull(),
    title: text('title').notNull(),
    summary: text('summary'),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    effectiveAt: timestamp('effective_at', { withTimezone: true }),
    reportingPeriod: varchar('reporting_period', { length: 64 }),
    sourceReference: text('source_reference').notNull(),
    normalizedAttributes: jsonb('normalized_attributes')
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    ...provenance,
  },
  (t) => [
    uniqueIndex('corporate_disclosure_provider_revision_unique').on(
      t.providerId,
      t.externalDisclosureId,
      t.providerRevision,
    ),
    index('corporate_disclosure_company_published_idx').on(
      t.companyId,
      t.publishedAt,
    ),
    index('corporate_disclosure_type_published_idx').on(
      t.disclosureType,
      t.publishedAt,
    ),
    check(
      'corporate_disclosure_available_check',
      sql`${t.availableAt} >= ${t.publishedAt} and ${t.availableAt} <= ${t.ingestedAt}`,
    ),
    check(
      'corporate_disclosure_state_check',
      sql`${t.state} in ('ACTIVE','CORRECTED','SUPERSEDED','WITHDRAWN')`,
    ),
  ],
);

export const corporateDisclosureEntities = pgTable(
  'corporate_disclosure_entities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    disclosureRevisionId: uuid('disclosure_revision_id')
      .notNull()
      .references(() => corporateDisclosureRevisions.revisionId, {
        onDelete: 'restrict',
      }),
    entityType: varchar('entity_type', { length: 16 }).notNull(),
    companyId: uuid('company_id').references(() => intelligenceCompanies.id, {
      onDelete: 'restrict',
    }),
    instrumentId: uuid('instrument_id').references(() => instruments.id, {
      onDelete: 'restrict',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex('corporate_disclosure_entity_company_unique')
      .on(t.disclosureRevisionId, t.companyId)
      .where(sql`${t.entityType} = 'COMPANY'`),
    uniqueIndex('corporate_disclosure_entity_instrument_unique')
      .on(t.disclosureRevisionId, t.instrumentId)
      .where(sql`${t.entityType} = 'INSTRUMENT'`),
    index('corporate_disclosure_entity_company_idx').on(
      t.companyId,
      t.disclosureRevisionId,
    ),
    index('corporate_disclosure_entity_instrument_idx').on(
      t.instrumentId,
      t.disclosureRevisionId,
    ),
    check(
      'corporate_disclosure_entity_shape_check',
      sql`(${t.entityType} = 'COMPANY' and ${t.companyId} is not null and ${t.instrumentId} is null)
        or (${t.entityType} = 'INSTRUMENT' and ${t.instrumentId} is not null and ${t.companyId} is null)`,
    ),
  ],
);

/**
 * Mutable resolution projection for correction chains that arrive out of order.
 * Canonical disclosure revisions remain immutable; only this linkage projection
 * is completed when the referenced provider revision becomes available.
 */
export const corporateDisclosureRevisionLinks = pgTable(
  'corporate_disclosure_revision_links',
  {
    childRevisionId: uuid('child_revision_id')
      .primaryKey()
      .references(() => corporateDisclosureRevisions.revisionId, {
        onDelete: 'restrict',
      }),
    parentRevisionId: uuid('parent_revision_id').references(
      () => corporateDisclosureRevisions.revisionId,
      { onDelete: 'restrict' },
    ),
    supersedesProviderRevision: varchar('supersedes_provider_revision', {
      length: 128,
    }).notNull(),
    resolutionState: varchar('resolution_state', { length: 32 })
      .default('AWAITING_PREVIOUS_REVISION')
      .notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('corporate_disclosure_revision_parent_idx').on(t.parentRevisionId),
    check(
      'corporate_disclosure_revision_resolution_check',
      sql`(${t.resolutionState} = 'COMPLETE' and ${t.parentRevisionId} is not null and ${t.resolvedAt} is not null)
        or (${t.resolutionState} = 'AWAITING_PREVIOUS_REVISION' and ${t.parentRevisionId} is null and ${t.resolvedAt} is null)`,
    ),
  ],
);

export const intelligenceMarketEvents = pgTable(
  'intelligence_market_events',
  {
    ...revision,
    eventId: uuid('event_id').notNull(),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    entityType: varchar('entity_type', { length: 32 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    effectiveAt: timestamp('effective_at', { withTimezone: true }),
    sourceReference: text('source_reference').notNull(),
    methodologyVersion: varchar('methodology_version', { length: 64 }),
    attributes: jsonb('attributes')
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    ...provenance,
  },
  (t) => [
    uniqueIndex('intelligence_market_events_provider_revision_unique').on(
      t.providerId,
      t.eventId,
      t.providerRevision,
    ),
    index('intelligence_market_events_entity_published_idx').on(
      t.entityType,
      t.entityId,
      t.publishedAt,
    ),
    index('intelligence_market_events_type_available_idx').on(
      t.eventType,
      t.availableAt,
    ),
  ],
);

export const institutionalFlowObservations = pgTable(
  'institutional_flow_observations',
  {
    ...revision,
    instrumentId: uuid('instrument_id')
      .notNull()
      .references(() => instruments.id, { onDelete: 'restrict' }),
    institutionId: uuid('institution_id')
      .notNull()
      .references(() => intelligenceInstitutions.id, { onDelete: 'restrict' }),
    tradeDate: date('trade_date').notNull(),
    session: varchar('session', { length: 32 }).default('ALL').notNull(),
    buyQuantity: numeric('buy_quantity', { precision: 28, scale: 10 }),
    sellQuantity: numeric('sell_quantity', { precision: 28, scale: 10 }),
    netQuantity: numeric('net_quantity', { precision: 28, scale: 10 }),
    buyValue: numeric('buy_value', { precision: 28, scale: 10 }),
    sellValue: numeric('sell_value', { precision: 28, scale: 10 }),
    netValue: numeric('net_value', { precision: 28, scale: 10 }),
    buyAveragePrice: numeric('buy_average_price', {
      precision: 28,
      scale: 10,
    }),
    sellAveragePrice: numeric('sell_average_price', {
      precision: 28,
      scale: 10,
    }),
    totalVolume: numeric('total_volume', { precision: 28, scale: 10 }),
    marketShare: numeric('market_share', { precision: 20, scale: 12 }),
    rank: numeric('rank', { precision: 10, scale: 0 }),
    coverageRatio: numeric('coverage_ratio', { precision: 20, scale: 12 }),
    currency: varchar('currency', { length: 3 }).notNull(),
    asOf: timestamp('as_of', { withTimezone: true }).notNull(),
    dataCutoff: timestamp('data_cutoff', { withTimezone: true }).notNull(),
    derivedMetrics: jsonb('derived_metrics')
      .$type<Record<string, string>>()
      .default({})
      .notNull(),
    ...provenance,
  },
  (t) => [
    uniqueIndex('institutional_flow_natural_revision_unique').on(
      t.providerId,
      t.instrumentId,
      t.institutionId,
      t.tradeDate,
      t.session,
      t.providerRevision,
    ),
    index('institutional_flow_instrument_date_idx').on(
      t.instrumentId,
      t.tradeDate,
    ),
    index('institutional_flow_institution_date_idx').on(
      t.institutionId,
      t.tradeDate,
    ),
    check(
      'institutional_flow_market_share_check',
      sql`${t.marketShare} is null or (${t.marketShare} >= 0 and ${t.marketShare} <= 1)`,
    ),
    check(
      'institutional_flow_coverage_ratio_check',
      sql`${t.coverageRatio} is null or (${t.coverageRatio} >= 0 and ${t.coverageRatio} <= 1)`,
    ),
  ],
);

export const settlementSnapshots = pgTable(
  'settlement_snapshots',
  {
    ...revision,
    instrumentId: uuid('instrument_id')
      .notNull()
      .references(() => instruments.id, { onDelete: 'restrict' }),
    institutionId: uuid('institution_id')
      .notNull()
      .references(() => intelligenceInstitutions.id, { onDelete: 'restrict' }),
    tradeDate: date('trade_date'),
    settlementDate: date('settlement_date').notNull(),
    holdingQuantity: numeric('holding_quantity', { precision: 28, scale: 10 }),
    holdingRatio: numeric('holding_ratio', { precision: 20, scale: 12 }),
    changeQuantity: numeric('change_quantity', { precision: 28, scale: 10 }),
    changeRatio: numeric('change_ratio', { precision: 20, scale: 12 }),
    residency: varchar('residency', { length: 16 }).notNull(),
    coverageRatio: numeric('coverage_ratio', { precision: 20, scale: 12 }),
    dataCutoff: timestamp('data_cutoff', { withTimezone: true }).notNull(),
    ...provenance,
  },
  (t) => [
    uniqueIndex('settlement_snapshot_natural_revision_unique').on(
      t.providerId,
      t.instrumentId,
      t.institutionId,
      t.settlementDate,
      t.providerRevision,
    ),
    index('settlement_snapshot_instrument_date_idx').on(
      t.instrumentId,
      t.settlementDate,
    ),
    index('settlement_snapshot_institution_date_idx').on(
      t.institutionId,
      t.settlementDate,
    ),
    check(
      'settlement_snapshot_holding_ratio_check',
      sql`${t.holdingRatio} is null or (${t.holdingRatio} >= 0 and ${t.holdingRatio} <= 1)`,
    ),
    check(
      'settlement_snapshot_change_ratio_check',
      sql`${t.changeRatio} is null or (${t.changeRatio} >= -1 and ${t.changeRatio} <= 1)`,
    ),
    check(
      'settlement_snapshot_coverage_ratio_check',
      sql`${t.coverageRatio} is null or (${t.coverageRatio} >= 0 and ${t.coverageRatio} <= 1)`,
    ),
    check(
      'settlement_snapshot_residency_check',
      sql`${t.residency} in ('FOREIGN','DOMESTIC','UNKNOWN')`,
    ),
  ],
);

export const intelligenceMarketMeasures = pgTable(
  'intelligence_market_measures',
  {
    ...revision,
    measureId: varchar('measure_id', { length: 255 }).notNull(),
    instrumentId: uuid('instrument_id')
      .notNull()
      .references(() => instruments.id, { onDelete: 'restrict' }),
    type: varchar('type', { length: 48 }).notNull(),
    effectiveFrom: timestamp('effective_from', {
      withTimezone: true,
    }).notNull(),
    effectiveUntil: timestamp('effective_until', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    status: varchar('status', { length: 24 }).notNull(),
    sourceReference: text('source_reference').notNull(),
    structuredAttributes: jsonb('structured_attributes')
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    ...provenance,
  },
  (t) => [
    uniqueIndex('intelligence_market_measure_revision_unique').on(
      t.providerId,
      t.measureId,
      t.providerRevision,
    ),
    index('intelligence_market_measure_instrument_period_idx').on(
      t.instrumentId,
      t.effectiveFrom,
      t.effectiveUntil,
    ),
    index('intelligence_market_measure_type_period_idx').on(
      t.type,
      t.effectiveFrom,
      t.effectiveUntil,
    ),
    index('intelligence_market_measure_published_idx').on(t.publishedAt),
    index('intelligence_market_measure_available_idx').on(t.availableAt),
    check(
      'intelligence_market_measure_period_check',
      sql`${t.effectiveUntil} is null or ${t.effectiveUntil} >= ${t.effectiveFrom}`,
    ),
    check(
      'intelligence_market_measure_status_check',
      sql`${t.status} in ('SCHEDULED','ACTIVE','EXPIRED','CORRECTED','SUPERSEDED','CANCELLED')`,
    ),
  ],
);

/**
 * Canonical observed short-selling statistics. This is deliberately separate
 * from policy/restriction measures and stores no inferred or zero-filled data.
 */
export const shortSellingActivityObservations = pgTable(
  'short_selling_activity_observations',
  {
    ...revision,
    activityId: varchar('activity_id', { length: 255 }).notNull(),
    instrumentId: uuid('instrument_id')
      .notNull()
      .references(() => instruments.id, { onDelete: 'restrict' }),
    tradeDate: date('trade_date').notNull(),
    session: varchar('session', { length: 32 }).default('ALL').notNull(),
    quantity: numeric('quantity', { precision: 28, scale: 10 }),
    value: numeric('value', { precision: 28, scale: 10 }),
    shareOfTurnover: numeric('share_of_turnover', {
      precision: 20,
      scale: 12,
    }),
    dataCutoff: timestamp('data_cutoff', { withTimezone: true }).notNull(),
    ...provenance,
  },
  (t) => [
    uniqueIndex('short_selling_activity_revision_unique').on(
      t.providerId,
      t.activityId,
      t.providerRevision,
    ),
    index('short_selling_activity_instrument_date_idx').on(
      t.instrumentId,
      t.tradeDate,
    ),
    check(
      'short_selling_activity_nonnegative_check',
      sql`(${t.quantity} is null or ${t.quantity} >= 0) and (${t.value} is null or ${t.value} >= 0)`,
    ),
    check(
      'short_selling_activity_share_check',
      sql`${t.shareOfTurnover} is null or (${t.shareOfTurnover} >= 0 and ${t.shareOfTurnover} <= 1)`,
    ),
    check(
      'short_selling_activity_has_value_check',
      sql`${t.quantity} is not null or ${t.value} is not null or ${t.shareOfTurnover} is not null`,
    ),
  ],
);

export const fundHoldingRevisions = pgTable(
  'fund_holding_revisions',
  {
    ...revision,
    fundId: uuid('fund_id')
      .notNull()
      .references(() => intelligenceFunds.id, { onDelete: 'restrict' }),
    instrumentId: uuid('instrument_id')
      .notNull()
      .references(() => instruments.id, { onDelete: 'restrict' }),
    reportingDate: date('reporting_date').notNull(),
    quantity: numeric('quantity', { precision: 28, scale: 10 }),
    value: numeric('value', { precision: 28, scale: 10 }),
    weight: numeric('weight', { precision: 20, scale: 12 }),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    ...provenance,
  },
  (t) => [
    uniqueIndex('fund_holding_natural_revision_unique').on(
      t.providerId,
      t.fundId,
      t.instrumentId,
      t.reportingDate,
      t.providerRevision,
    ),
    index('fund_holding_fund_reporting_idx').on(t.fundId, t.reportingDate),
    index('fund_holding_instrument_reporting_idx').on(
      t.instrumentId,
      t.reportingDate,
    ),
  ],
);
