import { createHash } from 'node:crypto';
import {
  dataProviders,
  intelligenceExternalIdentityMappings,
  intelligenceMarketEvents,
  intelligenceMarketMeasures,
  providerConnections,
  providerIngestionRuns,
  shortSellingActivityObservations,
  type Database,
} from '@atlas/database';
import type { ExternalIdentityMapping } from '@atlas/domain';
import { and, eq, gte, inArray, isNull, lte, or } from 'drizzle-orm';
import type { MarketStructureIngestionStore } from './contracts';

export class DatabaseMarketStructureIngestionStore implements MarketStructureIngestionStore {
  constructor(private readonly database: Database) {}
  async resolveContext(providerCode: string, at: Date) {
    const provider = (
      await this.database
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
        .limit(1)
    )[0];
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
    input: Parameters<MarketStructureIngestionStore['beginRun']>[0],
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
    const existing = (
      await this.database
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
        .limit(1)
    )[0];
    if (!existing) throw new Error('MARKET_STRUCTURE_RUN_IDEMPOTENCY_CONFLICT');
    return { runId: existing.id, completed: existing.status === 'completed' };
  }
  async persistMeasures(
    records: Parameters<MarketStructureIngestionStore['persistMeasures']>[0],
  ) {
    let inserted = 0;
    let eventsInserted = 0;
    for (const { measure, supersedesProviderRevision } of records) {
      const providerRevision = measure.providerRevision;
      if (!providerRevision)
        throw new Error('MARKET_MEASURE_PROVIDER_REVISION_REQUIRED');
      const prior = supersedesProviderRevision
        ? (
            await this.database
              .select({ id: intelligenceMarketMeasures.revisionId })
              .from(intelligenceMarketMeasures)
              .where(
                and(
                  eq(
                    intelligenceMarketMeasures.providerId,
                    measure.provenance.providerId,
                  ),
                  eq(intelligenceMarketMeasures.measureId, measure.measureId),
                  eq(
                    intelligenceMarketMeasures.providerRevision,
                    supersedesProviderRevision,
                  ),
                ),
              )
              .limit(1)
          )[0]
        : undefined;
      const rows = await this.database
        .insert(intelligenceMarketMeasures)
        .values({
          revisionId: measure.revisionId,
          supersedesRevisionId: prior?.id ?? null,
          correctionReason: measure.correctionReason,
          measureId: measure.measureId,
          instrumentId: measure.instrumentId,
          type: measure.type,
          effectiveFrom: measure.effectiveFrom,
          effectiveUntil: measure.effectiveUntil,
          publishedAt: measure.publishedAt,
          status: measure.status,
          sourceReference: measure.sourceReference,
          structuredAttributes: measure.structuredAttributes,
          providerId: measure.provenance.providerId,
          providerDataset: measure.provenance.providerDataset,
          providerRevision,
          sourceTimestamp: measure.provenance.sourceTimestamp,
          ingestedAt: measure.ingestedAt,
          availableAt: measure.availableAt,
          deliveryMode: measure.provenance.deliveryMode,
          licenseClass: measure.provenance.license.licenseClass,
          redistributionClasses: measure.provenance.license.redistribution,
          qualityState: measure.provenance.quality,
        })
        .onConflictDoNothing()
        .returning({ id: intelligenceMarketMeasures.revisionId });
      inserted += rows.length;
      const persistedRevisionId =
        rows[0]?.id ??
        (
          await this.database
            .select({ id: intelligenceMarketMeasures.revisionId })
            .from(intelligenceMarketMeasures)
            .where(
              and(
                eq(
                  intelligenceMarketMeasures.providerId,
                  measure.provenance.providerId,
                ),
                eq(intelligenceMarketMeasures.measureId, measure.measureId),
                eq(
                  intelligenceMarketMeasures.providerRevision,
                  providerRevision,
                ),
              ),
            )
            .limit(1)
        )[0]?.id;
      if (!persistedRevisionId)
        throw new Error('MARKET_MEASURE_PERSISTENCE_CONFLICT');
      const event = await this.database
        .insert(intelligenceMarketEvents)
        .values({
          revisionId: persistedRevisionId,
          supersedesRevisionId: prior?.id ?? null,
          correctionReason: measure.correctionReason,
          eventId: stableUuid(
            `${measure.provenance.providerId}:${measure.measureId}`,
          ),
          eventType: 'MARKET_MEASURE',
          entityType: 'INSTRUMENT',
          entityId: measure.instrumentId,
          occurredAt: measure.effectiveFrom,
          publishedAt: measure.publishedAt,
          effectiveAt: measure.effectiveFrom,
          sourceReference: measure.sourceReference,
          methodologyVersion: 'market-measure-normalization-v1',
          attributes: {
            measureType: measure.type,
            effectiveUntil: measure.effectiveUntil?.toISOString() ?? null,
            status: measure.status,
          },
          providerId: measure.provenance.providerId,
          providerDataset: measure.provenance.providerDataset,
          providerRevision,
          sourceTimestamp: measure.provenance.sourceTimestamp,
          ingestedAt: measure.ingestedAt,
          availableAt: measure.availableAt,
          deliveryMode: measure.provenance.deliveryMode,
          licenseClass: measure.provenance.license.licenseClass,
          redistributionClasses: measure.provenance.license.redistribution,
          qualityState: measure.provenance.quality,
        })
        .onConflictDoNothing()
        .returning({ id: intelligenceMarketEvents.revisionId });
      eventsInserted += event.length;
    }
    return { inserted, duplicates: records.length - inserted, eventsInserted };
  }
  async persistActivities(
    records: Parameters<MarketStructureIngestionStore['persistActivities']>[0],
  ) {
    let inserted = 0;
    for (const { activity, supersedesProviderRevision } of records) {
      const prior = supersedesProviderRevision
        ? (
            await this.database
              .select({ id: shortSellingActivityObservations.revisionId })
              .from(shortSellingActivityObservations)
              .where(
                and(
                  eq(
                    shortSellingActivityObservations.providerId,
                    activity.provenance.providerId,
                  ),
                  eq(
                    shortSellingActivityObservations.activityId,
                    activity.activityId,
                  ),
                  eq(
                    shortSellingActivityObservations.providerRevision,
                    supersedesProviderRevision,
                  ),
                ),
              )
              .limit(1)
          )[0]
        : undefined;
      const result = await this.database
        .insert(shortSellingActivityObservations)
        .values({
          revisionId: activity.revisionId,
          supersedesRevisionId: prior?.id ?? null,
          correctionReason: activity.correctionReason,
          activityId: activity.activityId,
          instrumentId: activity.instrumentId,
          tradeDate: activity.tradeDate,
          session: activity.session ?? 'ALL',
          quantity: activity.quantity,
          value: activity.value,
          shareOfTurnover: activity.shareOfTurnover,
          dataCutoff: activity.dataCutoff,
          providerId: activity.provenance.providerId,
          providerDataset: activity.provenance.providerDataset,
          providerRevision: activity.providerRevision,
          sourceTimestamp: activity.provenance.sourceTimestamp,
          ingestedAt: activity.ingestedAt,
          availableAt: activity.availableAt,
          deliveryMode: activity.provenance.deliveryMode,
          licenseClass: activity.provenance.license.licenseClass,
          redistributionClasses: activity.provenance.license.redistribution,
          qualityState: activity.provenance.quality,
        })
        .onConflictDoNothing()
        .returning({ id: shortSellingActivityObservations.revisionId });
      inserted += result.length;
    }
    return { inserted, duplicates: records.length - inserted };
  }
  async completeRun(
    input: Parameters<MarketStructureIngestionStore['completeRun']>[0],
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

function stableUuid(input: string): string {
  const hex = createHash('sha256').update(input).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20)}`;
}
