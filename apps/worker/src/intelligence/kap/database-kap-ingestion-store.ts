import {
  corporateDisclosureEntities,
  corporateDisclosureRevisionLinks,
  corporateDisclosureRevisions,
  dataProviders,
  intelligenceExternalIdentityMappings,
  intelligenceMarketEvents,
  providerConnections,
  providerIngestionRuns,
  type Database,
} from '@atlas/database';
import type {
  ExternalIdentityMapping,
  NormalizedKapDisclosure,
} from '@atlas/domain';
import { and, eq, inArray, lte, or, isNull, gte, sql } from 'drizzle-orm';

import type { KapIngestionStore } from './contracts';

export class DatabaseKapIngestionStore implements KapIngestionStore {
  constructor(private readonly database: Database) {}

  async resolveContext(providerCode: string, at: Date) {
    const providers = await this.database
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
    const provider = providers[0];
    if (!provider) return null;
    const rows = await this.database
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
    const mappings: readonly ExternalIdentityMapping[] = rows.map((row) => ({
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
    }));
    return { ...provider, mappings };
  }

  async beginRun(input: {
    readonly providerConnectionId: string;
    readonly idempotencyKey: string;
    readonly correlationId: string;
    readonly sourceCursor: string | null;
  }) {
    const inserted = await this.database
      .insert(providerIngestionRuns)
      .values({
        providerConnectionId: input.providerConnectionId,
        capability: 'disclosure.kap',
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
    if (!existing[0]) throw new Error('KAP_RUN_IDEMPOTENCY_CONFLICT');
    return {
      runId: existing[0].id,
      completed: existing[0].status === 'completed',
    };
  }

  async persist(_runId: string, records: readonly NormalizedKapDisclosure[]) {
    return this.database.transaction(async (tx) => {
      let disclosuresInserted = 0,
        eventsInserted = 0,
        duplicates = 0;
      for (const record of records) {
        let supersedesRevisionId: string | null = null;
        if (record.supersedesProviderRevision) {
          const prior = await tx
            .select({ id: corporateDisclosureRevisions.revisionId })
            .from(corporateDisclosureRevisions)
            .where(
              and(
                eq(
                  corporateDisclosureRevisions.providerId,
                  record.disclosure.provenance.providerId,
                ),
                eq(
                  corporateDisclosureRevisions.externalDisclosureId,
                  record.disclosure.externalDisclosureId,
                ),
                eq(
                  corporateDisclosureRevisions.providerRevision,
                  record.supersedesProviderRevision,
                ),
              ),
            )
            .limit(1);
          supersedesRevisionId = prior[0]?.id ?? null;
        }
        const inserted = await tx
          .insert(corporateDisclosureRevisions)
          .values({
            revisionId: record.disclosure.revisionId,
            supersedesRevisionId,
            correctionReason: record.disclosure.correctionReason,
            disclosureId: record.disclosure.disclosureId,
            externalDisclosureId: record.disclosure.externalDisclosureId,
            companyId: record.disclosure.companyId,
            disclosureType: record.disclosure.disclosureType,
            state: record.state,
            category: record.disclosure.category,
            title: record.disclosure.title,
            summary: record.disclosure.summary,
            publishedAt: record.disclosure.publishedAt,
            effectiveAt: record.disclosure.effectiveAt,
            reportingPeriod: record.disclosure.reportingPeriod,
            sourceReference: record.disclosure.sourceReference,
            normalizedAttributes: {
              sourceCategory: record.sourceCategory,
              classification: record.classification,
              attachments: record.disclosure.attachmentMetadata,
              companyIds: record.companyIds,
              instrumentIds: record.instrumentIds,
              supersedesProviderRevision: record.supersedesProviderRevision,
              chainStatus:
                supersedesRevisionId || !record.supersedesProviderRevision
                  ? 'COMPLETE'
                  : 'AWAITING_PREVIOUS_REVISION',
            },
            providerId: record.disclosure.provenance.providerId,
            providerDataset: record.disclosure.provenance.providerDataset,
            providerRevision: record.disclosure.providerRevision,
            sourceTimestamp: record.disclosure.provenance.sourceTimestamp,
            ingestedAt: record.disclosure.ingestedAt,
            availableAt: record.disclosure.availableAt,
            deliveryMode: record.disclosure.provenance.deliveryMode,
            licenseClass: record.disclosure.provenance.license.licenseClass,
            redistributionClasses:
              record.disclosure.provenance.license.redistribution,
            qualityState: record.disclosure.provenance.quality,
          })
          .onConflictDoNothing()
          .returning({ id: corporateDisclosureRevisions.revisionId });
        if (!inserted[0]) {
          duplicates += 1;
          continue;
        }
        disclosuresInserted += 1;
        const associations = [
          ...record.companyIds.map((companyId) => ({
            disclosureRevisionId: record.disclosure.revisionId,
            entityType: 'COMPANY',
            companyId,
            instrumentId: null,
          })),
          ...record.instrumentIds.map((instrumentId) => ({
            disclosureRevisionId: record.disclosure.revisionId,
            entityType: 'INSTRUMENT',
            companyId: null,
            instrumentId,
          })),
        ];
        if (associations.length)
          await tx
            .insert(corporateDisclosureEntities)
            .values(associations)
            .onConflictDoNothing();
        if (record.supersedesProviderRevision)
          await tx
            .insert(corporateDisclosureRevisionLinks)
            .values({
              childRevisionId: record.disclosure.revisionId,
              parentRevisionId: supersedesRevisionId,
              supersedesProviderRevision: record.supersedesProviderRevision,
              resolutionState: supersedesRevisionId
                ? 'COMPLETE'
                : 'AWAITING_PREVIOUS_REVISION',
              resolvedAt: supersedesRevisionId ? new Date() : null,
            })
            .onConflictDoNothing();
        const events = await tx
          .insert(intelligenceMarketEvents)
          .values({
            revisionId: record.event.revisionId,
            supersedesRevisionId,
            correctionReason: record.event.correctionReason,
            eventId: record.event.id.replace('disclosure:', '').slice(0, 36),
            eventType: record.event.eventType,
            entityType: record.event.entityType,
            entityId: record.event.entityId,
            occurredAt: record.event.occurredAt,
            publishedAt: record.event.publishedAt,
            effectiveAt: record.event.effectiveAt,
            sourceReference: record.event.sourceReference,
            methodologyVersion: record.classification.methodologyVersion,
            attributes: record.event.attributes,
            providerId: record.event.provenance.providerId,
            providerDataset: record.event.provenance.providerDataset,
            providerRevision: record.event.providerRevision,
            sourceTimestamp: record.event.provenance.sourceTimestamp,
            ingestedAt: record.event.ingestedAt,
            availableAt: record.event.availableAt,
            deliveryMode: record.event.provenance.deliveryMode,
            licenseClass: record.event.provenance.license.licenseClass,
            redistributionClasses:
              record.event.provenance.license.redistribution,
            qualityState: record.event.provenance.quality,
          })
          .onConflictDoNothing()
          .returning({ id: intelligenceMarketEvents.revisionId });
        eventsInserted += events.length;
        // A correction can be delivered before its prior revision during backfill.
        // Source/event revisions remain immutable; only this resolution projection changes.
        await tx.execute(sql`
          update corporate_disclosure_revision_links link
          set parent_revision_id=${record.disclosure.revisionId},
              resolution_state='COMPLETE', resolved_at=now(), updated_at=now()
          from corporate_disclosure_revisions child
          where child.revision_id=link.child_revision_id
            and child.provider_id=${record.disclosure.provenance.providerId}
            and child.external_disclosure_id=${record.disclosure.externalDisclosureId}
            and link.resolution_state='AWAITING_PREVIOUS_REVISION'
            and link.supersedes_provider_revision=${record.disclosure.providerRevision}
        `);
      }
      return { disclosuresInserted, eventsInserted, duplicates };
    });
  }

  async completeRun(input: {
    readonly runId: string;
    readonly sourceCursor: string | null;
    readonly recordsRead: number;
    readonly recordsAccepted: number;
    readonly recordsRejected: number;
  }) {
    await this.database
      .update(providerIngestionRuns)
      .set({
        status: input.recordsRejected > 0 ? 'partial' : 'completed',
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
