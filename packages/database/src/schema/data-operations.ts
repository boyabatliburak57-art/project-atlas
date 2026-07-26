import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { securityUsers } from './security';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const providerConnections = pgTable(
  'provider_connections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerKey: varchar('provider_key', { length: 80 }).notNull(),
    environment: varchar('environment', { length: 24 }).notNull(),
    status: varchar('status', { length: 24 }).default('configured').notNull(),
    credentialReference: varchar('credential_reference', {
      length: 512,
    }).notNull(),
    capabilities: jsonb('capabilities').$type<readonly string[]>().notNull(),
    licenseMetadata: jsonb('license_metadata')
      .$type<Readonly<Record<string, unknown>>>()
      .default({})
      .notNull(),
    health: jsonb('health')
      .$type<Readonly<Record<string, unknown>>>()
      .default({})
      .notNull(),
    version: integer('version').default(1).notNull(),
    ...timestamps,
  },
  (table) => [
    unique('provider_connections_key_environment_unique').on(
      table.providerKey,
      table.environment,
    ),
    index('provider_connections_status_idx').on(table.status),
    check(
      'provider_connections_status_check',
      sql`${table.status} in ('configured', 'healthy', 'degraded', 'unavailable', 'disabled')`,
    ),
    check(
      'provider_connections_credential_reference_check',
      sql`${table.credentialReference} ~ '^(secret|vault|aws-sm|gcp-sm|azure-kv)://'`,
    ),
    check('provider_connections_version_check', sql`${table.version} > 0`),
    check(
      'provider_connections_payload_size_check',
      sql`octet_length(${table.capabilities}::text) <= 8192
          and octet_length(${table.licenseMetadata}::text) <= 16384
          and octet_length(${table.health}::text) <= 16384`,
    ),
  ],
);

export const providerIngestionRuns = pgTable(
  'provider_ingestion_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerConnectionId: uuid('provider_connection_id')
      .notNull()
      .references(() => providerConnections.id, { onDelete: 'restrict' }),
    capability: varchar('capability', { length: 48 }).notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 160 }).notNull(),
    status: varchar('status', { length: 24 }).notNull(),
    correlationId: varchar('correlation_id', { length: 128 }).notNull(),
    sourceCursor: varchar('source_cursor', { length: 512 }),
    recordsRead: integer('records_read').default(0).notNull(),
    recordsAccepted: integer('records_accepted').default(0).notNull(),
    recordsRejected: integer('records_rejected').default(0).notNull(),
    errorClass: varchar('error_class', { length: 40 }),
    startedAt: timestamp('started_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    metadata: jsonb('metadata')
      .$type<Readonly<Record<string, unknown>>>()
      .default({})
      .notNull(),
  },
  (table) => [
    unique('provider_ingestion_runs_connection_idempotency_unique').on(
      table.providerConnectionId,
      table.idempotencyKey,
    ),
    index('provider_ingestion_runs_status_started_idx').on(
      table.status,
      table.startedAt,
    ),
    check(
      'provider_ingestion_runs_status_check',
      sql`${table.status} in ('queued', 'running', 'completed', 'partial', 'failed', 'cancelled')`,
    ),
    check(
      'provider_ingestion_runs_counts_check',
      sql`${table.recordsRead} >= 0 and ${table.recordsAccepted} >= 0 and ${table.recordsRejected} >= 0`,
    ),
    check(
      'provider_ingestion_runs_metadata_size_check',
      sql`octet_length(${table.metadata}::text) <= 32768`,
    ),
  ],
);

export const providerDataRevisions = pgTable(
  'provider_data_revisions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerConnectionId: uuid('provider_connection_id')
      .notNull()
      .references(() => providerConnections.id, { onDelete: 'restrict' }),
    ingestionRunId: uuid('ingestion_run_id').references(
      () => providerIngestionRuns.id,
      { onDelete: 'restrict' },
    ),
    capability: varchar('capability', { length: 48 }).notNull(),
    resourceType: varchar('resource_type', { length: 64 }).notNull(),
    resourceKey: varchar('resource_key', { length: 240 }).notNull(),
    providerRevision: varchar('provider_revision', { length: 160 }).notNull(),
    sourceTimestamp: timestamp('source_timestamp', {
      withTimezone: true,
    }).notNull(),
    availableAt: timestamp('available_at', { withTimezone: true }).notNull(),
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    supersedesRevisionId: uuid('supersedes_revision_id'),
    evidence: jsonb('evidence')
      .$type<Readonly<Record<string, unknown>>>()
      .default({})
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('provider_data_revisions_natural_unique').on(
      table.providerConnectionId,
      table.resourceType,
      table.resourceKey,
      table.providerRevision,
    ),
    index('provider_data_revisions_resource_available_idx').on(
      table.resourceType,
      table.resourceKey,
      table.availableAt,
    ),
    check(
      'provider_data_revisions_hash_check',
      sql`${table.contentHash} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      'provider_data_revisions_evidence_size_check',
      sql`octet_length(${table.evidence}::text) <= 32768`,
    ),
  ],
);

export const dataQualityFindings = pgTable(
  'data_quality_findings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    fingerprint: varchar('fingerprint', { length: 64 }).notNull(),
    findingType: varchar('finding_type', { length: 64 }).notNull(),
    severity: varchar('severity', { length: 16 }).notNull(),
    status: varchar('status', { length: 24 }).default('open').notNull(),
    providerConnectionId: uuid('provider_connection_id').references(
      () => providerConnections.id,
      { onDelete: 'restrict' },
    ),
    providerRevisionId: uuid('provider_revision_id').references(
      () => providerDataRevisions.id,
      { onDelete: 'restrict' },
    ),
    resourceType: varchar('resource_type', { length: 64 }).notNull(),
    resourceKey: varchar('resource_key', { length: 240 }).notNull(),
    evidence: jsonb('evidence')
      .$type<Readonly<Record<string, unknown>>>()
      .default({})
      .notNull(),
    occurrences: integer('occurrences').default(1).notNull(),
    firstDetectedAt: timestamp('first_detected_at', {
      withTimezone: true,
    }).notNull(),
    lastDetectedAt: timestamp('last_detected_at', {
      withTimezone: true,
    }).notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    version: integer('version').default(1).notNull(),
    ...timestamps,
  },
  (table) => [
    unique('data_quality_findings_fingerprint_unique').on(table.fingerprint),
    index('data_quality_findings_status_severity_idx').on(
      table.status,
      table.severity,
      table.lastDetectedAt,
    ),
    check(
      'data_quality_findings_status_check',
      sql`${table.status} in ('open', 'investigating', 'resolved', 'suppressed')`,
    ),
    check(
      'data_quality_findings_severity_check',
      sql`${table.severity} in ('info', 'warning', 'critical')`,
    ),
    check(
      'data_quality_findings_counters_check',
      sql`${table.occurrences} > 0 and ${table.version} > 0`,
    ),
    check(
      'data_quality_findings_evidence_size_check',
      sql`octet_length(${table.evidence}::text) <= 32768`,
    ),
  ],
);

export const dataCorrectionRequests = pgTable(
  'data_correction_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    findingId: uuid('finding_id')
      .notNull()
      .references(() => dataQualityFindings.id, { onDelete: 'restrict' }),
    state: varchar('state', { length: 24 }).default('open').notNull(),
    reason: text('reason').notNull(),
    requestedByUserId: uuid('requested_by_user_id')
      .notNull()
      .references(() => securityUsers.id, { onDelete: 'restrict' }),
    reviewedByUserId: uuid('reviewed_by_user_id').references(
      () => securityUsers.id,
      { onDelete: 'restrict' },
    ),
    targetRevisionId: uuid('target_revision_id').references(
      () => providerDataRevisions.id,
      { onDelete: 'restrict' },
    ),
    replayIdempotencyKey: varchar('replay_idempotency_key', { length: 160 }),
    correlationId: varchar('correlation_id', { length: 128 }).notNull(),
    version: integer('version').default(1).notNull(),
    rebuildStatus: varchar('rebuild_status', { length: 24 })
      .default('not_requested')
      .notNull(),
    beforeState: jsonb('before_state')
      .$type<Readonly<Record<string, unknown>>>()
      .notNull(),
    afterState: jsonb('after_state')
      .$type<Readonly<Record<string, unknown>>>()
      .default({})
      .notNull(),
    failureCode: varchar('failure_code', { length: 80 }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    unique('data_correction_requests_replay_idempotency_unique').on(
      table.replayIdempotencyKey,
    ),
    index('data_correction_requests_state_updated_idx').on(
      table.state,
      table.updatedAt,
    ),
    check(
      'data_correction_requests_state_check',
      sql`${table.state} in ('open', 'investigating', 'approved', 'rejected', 'replayQueued', 'replaying', 'resolved', 'failed')`,
    ),
    check(
      'data_correction_requests_rebuild_status_check',
      sql`${table.rebuildStatus} in ('not_requested', 'stale', 'rebuilding', 'fresh', 'failed')`,
    ),
    check(
      'data_correction_requests_reason_check',
      sql`length(trim(${table.reason})) >= 8 and octet_length(${table.reason}) <= 4096`,
    ),
    check('data_correction_requests_version_check', sql`${table.version} > 0`),
    check(
      'data_correction_requests_payload_size_check',
      sql`octet_length(${table.beforeState}::text) <= 32768
          and octet_length(${table.afterState}::text) <= 32768`,
    ),
  ],
);

export const dataOperationsSchema = {
  dataCorrectionRequests,
  dataQualityFindings,
  providerConnections,
  providerDataRevisions,
  providerIngestionRuns,
};
