import {
  adminSafeDiagnosticSummary,
  CacheInvalidationDispatcher,
  DataFreshnessEvaluator,
  QualityMetrics,
  type CacheBackend,
  type InvalidationEvent,
  type InvalidationRefreshPort,
} from '@atlas/domain';
import type { MarketIntelligenceReconciliationQueuePayload } from '@atlas/types';
import type { SnapshotReconciliationStore } from './database-snapshot-reconciliation-store';

export class SnapshotReconciliationService {
  private readonly freshness = new DataFreshnessEvaluator();
  private readonly metrics = new QualityMetrics();
  private readonly dispatcher: CacheInvalidationDispatcher;

  constructor(
    private readonly store: SnapshotReconciliationStore,
    cache: CacheBackend,
    refresh: InvalidationRefreshPort,
  ) {
    this.dispatcher = new CacheInvalidationDispatcher(
      cache,
      refresh,
      this.metrics,
    );
  }

  async execute(input: MarketIntelligenceReconciliationQueuePayload) {
    const snapshot = await this.store.reconcile(
      input.market.toUpperCase(),
      input.timeframe,
    );
    this.metrics.increment('reconciliation.query_count');
    if (!snapshot)
      return {
        snapshot: null,
        invalidations: [],
        diagnostic: adminSafeDiagnosticSummary({
          status: 'notEvaluable',
          stale: false,
          partial: false,
          generationConsistent: true,
          metrics: this.metrics.snapshot(),
          admin: true,
        }),
      };
    if (!snapshot.generationConsistent)
      throw new Error('MARKET_SNAPSHOT_GENERATION_MISMATCH');
    const quality = this.freshness.evaluate({
      now: new Date(),
      dataCutoffAt: snapshot.dataCutoffAt,
      sourceTimestamp: snapshot.sourceTimestamp,
      staleAfterMs: input.staleAfterMs,
      evaluatedCount: snapshot.evaluatedCount,
      excludedCount: snapshot.excludedCount,
      upstreamStatuses: [snapshot.status],
    });
    const invalidations = [];
    for (const payload of input.invalidations)
      invalidations.push(
        await this.dispatcher.dispatch(toDomainEvent(payload)),
      );
    return {
      snapshot: {
        generationId: snapshot.generationId,
        universeVersion: snapshot.universeVersion,
        policyVersion: snapshot.policyVersion,
        dataCutoffAt: snapshot.dataCutoffAt.toISOString(),
        sectorCount: snapshot.sectorCount,
        rankingCount: snapshot.rankingCount,
        queryCount: snapshot.queryCount,
      },
      invalidations,
      diagnostic: adminSafeDiagnosticSummary({
        ...quality,
        generationConsistent: snapshot.generationConsistent,
        metrics: this.metrics.snapshot(),
        internal: {
          generationId: snapshot.generationId,
          queryCount: snapshot.queryCount,
          providerRaw: 'never-exposed',
        },
        admin: true,
      }),
    };
  }
}

function toDomainEvent(
  input: MarketIntelligenceReconciliationQueuePayload['invalidations'][number],
): InvalidationEvent {
  const base = {
    eventId: input.eventId,
    type: input.type,
    version: input.version,
    occurredAt: new Date(input.occurredAt),
    ...(input.instrumentId ? { instrumentId: input.instrumentId } : {}),
    ...(input.market ? { market: input.market } : {}),
  };
  if (input.type === 'user_marker_ownership_change') {
    if (!input.userId) throw new Error('MARKET_INVALIDATION_EVENT_INVALID');
    return { ...base, type: input.type, userId: input.userId };
  }
  return base as InvalidationEvent;
}

export class ReconciliationRefreshCollector implements InvalidationRefreshPort {
  readonly requests: { scope: string; eventId: string }[] = [];

  request(scope: string, event: InvalidationEvent): Promise<void> {
    this.requests.push({ scope, eventId: event.eventId });
    return Promise.resolve();
  }
}
