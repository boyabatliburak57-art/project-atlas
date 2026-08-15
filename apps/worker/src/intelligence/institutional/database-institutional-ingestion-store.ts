import {
  dataProviders,
  intelligenceExternalIdentityMappings,
  institutionalFlowObservations,
  providerConnections,
  providerIngestionRuns,
  settlementSnapshots,
  type Database,
} from '@atlas/database';
import type { ExternalIdentityMapping } from '@atlas/domain';
import { and, eq, gte, inArray, isNull, lte, or } from 'drizzle-orm';

import type { InstitutionalIngestionStore } from './contracts';

export class DatabaseInstitutionalIngestionStore implements InstitutionalIngestionStore {
  constructor(private readonly database: Database) {}

  async resolveContext(providerCode: string, at: Date) {
    const rows = await this.database
      .select({
        providerId: dataProviders.id,
        providerConnectionId: providerConnections.id,
      })
      .from(dataProviders)
      .innerJoin(
        providerConnections,
        eq(providerConnections.providerKey, dataProviders.code),
      )
      .where(
        and(
          eq(dataProviders.code, providerCode),
          eq(dataProviders.status, 'active'),
          inArray(providerConnections.status, [
            'configured',
            'healthy',
            'degraded',
          ]),
        ),
      )
      .limit(1);
    const provider = rows[0];
    if (!provider) return null;
    const identities = await this.database
      .select()
      .from(intelligenceExternalIdentityMappings)
      .where(
        and(
          eq(
            intelligenceExternalIdentityMappings.providerId,
            provider.providerId,
          ),
          lte(intelligenceExternalIdentityMappings.validFrom, at),
          or(
            isNull(intelligenceExternalIdentityMappings.validTo),
            gte(intelligenceExternalIdentityMappings.validTo, at),
          ),
        ),
      );
    const mappings: readonly ExternalIdentityMapping[] = identities.map(
      (row) => ({
        providerId: row.providerId,
        entityType: row.entityType as ExternalIdentityMapping['entityType'],
        externalId: row.externalId,
        canonicalEntityId: row.canonicalEntityId,
        validFrom: row.validFrom,
        validTo: row.validTo,
        confidence: row.confidence === null ? null : Number(row.confidence),
        status: row.status as ExternalIdentityMapping['status'],
        source: row.source,
        manualReviewState:
          row.manualReviewState as ExternalIdentityMapping['manualReviewState'],
      }),
    );
    return { ...provider, mappings };
  }

  async beginRun(
    input: Parameters<InstitutionalIngestionStore['beginRun']>[0],
  ) {
    const inserted = await this.database
      .insert(providerIngestionRuns)
      .values({
        providerConnectionId: input.providerConnectionId,
        capability: input.capability,
        idempotencyKey: input.idempotencyKey,
        status: 'running',
        correlationId: input.correlationId,
        sourceCursor: input.sourceCursor,
      })
      .onConflictDoNothing()
      .returning({ id: providerIngestionRuns.id });
    if (inserted[0]) return { runId: inserted[0].id, completed: false };
    const existing = await this.database
      .select({
        id: providerIngestionRuns.id,
        status: providerIngestionRuns.status,
      })
      .from(providerIngestionRuns)
      .where(
        and(
          eq(
            providerIngestionRuns.providerConnectionId,
            input.providerConnectionId,
          ),
          eq(providerIngestionRuns.idempotencyKey, input.idempotencyKey),
        ),
      )
      .limit(1);
    if (!existing[0]) throw new Error('INSTITUTIONAL_RUN_IDEMPOTENCY_CONFLICT');
    return {
      runId: existing[0].id,
      completed: existing[0].status === 'completed',
    };
  }

  async persistFlows(
    _runId: string,
    records: Parameters<InstitutionalIngestionStore['persistFlows']>[1],
  ) {
    let inserted = 0;
    for (const {
      observation,
      supersedesProviderRevision,
      coverageRatio,
    } of records) {
      const prior = supersedesProviderRevision
        ? await this.database
            .select({ id: institutionalFlowObservations.revisionId })
            .from(institutionalFlowObservations)
            .where(
              and(
                eq(
                  institutionalFlowObservations.providerId,
                  observation.provenance.providerId,
                ),
                eq(
                  institutionalFlowObservations.instrumentId,
                  observation.instrumentId,
                ),
                eq(
                  institutionalFlowObservations.institutionId,
                  observation.institutionId,
                ),
                eq(
                  institutionalFlowObservations.tradeDate,
                  observation.tradeDate,
                ),
                eq(
                  institutionalFlowObservations.providerRevision,
                  supersedesProviderRevision,
                ),
              ),
            )
            .limit(1)
        : [];
      const result = await this.database
        .insert(institutionalFlowObservations)
        .values({
          revisionId: observation.revisionId,
          supersedesRevisionId: prior[0]?.id ?? null,
          correctionReason: observation.correctionReason,
          instrumentId: observation.instrumentId,
          institutionId: observation.institutionId,
          tradeDate: observation.tradeDate,
          session: observation.session ?? 'ALL',
          buyQuantity: observation.buyQuantity,
          sellQuantity: observation.sellQuantity,
          netQuantity: observation.netQuantity,
          buyValue: observation.buyValue,
          sellValue: observation.sellValue,
          netValue: observation.netValue,
          buyAveragePrice: observation.buyAveragePrice,
          sellAveragePrice: observation.sellAveragePrice,
          totalVolume: observation.totalVolume,
          marketShare: observation.marketShare,
          rank:
            observation.rank === undefined
              ? undefined
              : String(observation.rank),
          coverageRatio,
          currency: observation.currency,
          asOf: observation.asOf,
          dataCutoff: observation.dataCutoff,
          derivedMetrics: observation.derivedMetrics,
          providerId: observation.provenance.providerId,
          providerDataset: observation.provenance.providerDataset,
          providerRevision: observation.providerRevision,
          sourceTimestamp: observation.provenance.sourceTimestamp,
          ingestedAt: observation.ingestedAt,
          availableAt: observation.availableAt,
          deliveryMode: observation.provenance.deliveryMode,
          licenseClass: observation.provenance.license.licenseClass,
          redistributionClasses: observation.provenance.license.redistribution,
          qualityState: observation.provenance.quality,
        })
        .onConflictDoNothing()
        .returning({ id: institutionalFlowObservations.revisionId });
      inserted += result.length;
    }
    return { inserted, duplicates: records.length - inserted };
  }

  async persistSettlements(
    _runId: string,
    records: Parameters<InstitutionalIngestionStore['persistSettlements']>[1],
  ) {
    let inserted = 0;
    for (const {
      snapshot,
      supersedesProviderRevision,
      coverageRatio,
    } of records) {
      const prior = supersedesProviderRevision
        ? await this.database
            .select({ id: settlementSnapshots.revisionId })
            .from(settlementSnapshots)
            .where(
              and(
                eq(
                  settlementSnapshots.providerId,
                  snapshot.provenance.providerId,
                ),
                eq(settlementSnapshots.instrumentId, snapshot.instrumentId),
                eq(settlementSnapshots.institutionId, snapshot.institutionId),
                eq(settlementSnapshots.settlementDate, snapshot.settlementDate),
                eq(
                  settlementSnapshots.providerRevision,
                  supersedesProviderRevision,
                ),
              ),
            )
            .limit(1)
        : [];
      const result = await this.database
        .insert(settlementSnapshots)
        .values({
          revisionId: snapshot.revisionId,
          supersedesRevisionId: prior[0]?.id ?? null,
          correctionReason: snapshot.correctionReason,
          instrumentId: snapshot.instrumentId,
          institutionId: snapshot.institutionId,
          tradeDate: snapshot.tradeDate,
          settlementDate: snapshot.settlementDate,
          holdingQuantity: snapshot.holdingQuantity,
          holdingRatio: snapshot.holdingRatio,
          changeQuantity: snapshot.changeQuantity,
          changeRatio: snapshot.changeRatio,
          residency: snapshot.residency,
          coverageRatio,
          dataCutoff: snapshot.dataCutoff,
          providerId: snapshot.provenance.providerId,
          providerDataset: snapshot.provenance.providerDataset,
          providerRevision: snapshot.providerRevision,
          sourceTimestamp: snapshot.provenance.sourceTimestamp,
          ingestedAt: snapshot.ingestedAt,
          availableAt: snapshot.availableAt,
          deliveryMode: snapshot.provenance.deliveryMode,
          licenseClass: snapshot.provenance.license.licenseClass,
          redistributionClasses: snapshot.provenance.license.redistribution,
          qualityState: snapshot.provenance.quality,
        })
        .onConflictDoNothing()
        .returning({ id: settlementSnapshots.revisionId });
      inserted += result.length;
    }
    return { inserted, duplicates: records.length - inserted };
  }

  async completeRun(
    input: Parameters<InstitutionalIngestionStore['completeRun']>[0],
  ) {
    await this.database
      .update(providerIngestionRuns)
      .set({
        status: 'completed',
        sourceCursor: input.sourceCursor,
        recordsRead: input.recordsRead,
        recordsAccepted: input.recordsAccepted,
        recordsRejected: input.recordsRejected,
        completedAt: new Date(),
      })
      .where(eq(providerIngestionRuns.id, input.runId));
  }
  async failRun(runId: string, errorClass: string) {
    await this.database
      .update(providerIngestionRuns)
      .set({ status: 'failed', errorClass, completedAt: new Date() })
      .where(eq(providerIngestionRuns.id, runId));
  }
}
