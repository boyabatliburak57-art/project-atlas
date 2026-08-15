import {
  findOverlappingMarketMeasureRevisions,
  normalizeMarketMeasure,
  normalizeShortSellingActivity,
} from '@atlas/domain';

import type {
  MarketStructureIngestionStore,
  MarketStructureProviderAdapter,
} from './contracts';

export class MarketStructureIngestionError extends Error {
  override readonly name = 'MarketStructureIngestionError';
  constructor(
    readonly code:
      | 'MARKET_MEASURE_PROVIDER_REQUIRED'
      | 'SHORT_SELLING_PROVIDER_REQUIRED'
      | 'MARKET_MEASURE_RANGE_INVALID',
    readonly retryable: boolean,
  ) {
    super(code);
  }
}

interface RunInput {
  readonly from: Date;
  readonly to: Date;
  readonly cursor: string | null;
  readonly limit: number;
  readonly correlationId: string;
}

export class MarketStructureIngestionService {
  constructor(
    private readonly provider: MarketStructureProviderAdapter | null,
    private readonly store: MarketStructureIngestionStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  executeMeasures(input: RunInput) {
    return this.execute('MEASURES', input);
  }
  executeActivity(input: RunInput) {
    return this.execute('ACTIVITY', input);
  }

  private async execute(kind: 'MEASURES' | 'ACTIVITY', input: RunInput) {
    this.validate(input);
    const provider = this.provider;
    if (!provider)
      throw new MarketStructureIngestionError(
        kind === 'MEASURES'
          ? 'MARKET_MEASURE_PROVIDER_REQUIRED'
          : 'SHORT_SELLING_PROVIDER_REQUIRED',
        false,
      );
    if (kind === 'ACTIVITY' && !provider.fetchShortSellingActivity)
      throw new MarketStructureIngestionError(
        'SHORT_SELLING_PROVIDER_REQUIRED',
        false,
      );
    const context = await this.store.resolveContext(provider.code, input.to);
    if (!context)
      throw new MarketStructureIngestionError(
        'MARKET_MEASURE_PROVIDER_REQUIRED',
        false,
      );
    const capability =
      kind === 'MEASURES'
        ? 'marketMeasure.restrictions'
        : 'marketMeasure.shortSelling';
    const run = await this.store.beginRun({
      providerConnectionId: context.providerConnectionId,
      capability,
      idempotencyKey: [
        capability,
        provider.code,
        input.from.toISOString(),
        input.to.toISOString(),
        input.cursor ?? 'START',
      ].join(':'),
      correlationId: input.correlationId,
      sourceCursor: input.cursor,
    });
    if (run.completed)
      return {
        replayed: true,
        inserted: 0,
        duplicates: 0,
        rejected: 0,
        nextCursor: input.cursor,
      };
    try {
      const page =
        kind === 'MEASURES'
          ? await provider.fetchMarketMeasures(input)
          : await provider.fetchShortSellingActivity!(input);
      const records: (
        | ReturnType<typeof normalizeMarketMeasure>
        | ReturnType<typeof normalizeShortSellingActivity>
      )[] = [];
      let rejected = 0;
      for (const item of page.items) {
        try {
          const normalizationContext = {
            providerId: context.providerId,
            providerDataset: provider.dataset,
            fetchedAt: this.now(),
            deliveryMode: provider.deliveryMode,
            license: provider.license,
            mappings: context.mappings,
          };
          records.push(
            kind === 'MEASURES'
              ? normalizeMarketMeasure(
                  item as Parameters<typeof normalizeMarketMeasure>[0],
                  normalizationContext,
                )
              : normalizeShortSellingActivity(
                  item as Parameters<typeof normalizeShortSellingActivity>[0],
                  normalizationContext,
                ),
          );
        } catch {
          rejected += 1;
        }
      }
      let conflictRejected = 0;
      const persisted =
        kind === 'MEASURES'
          ? await this.persistNonConflictingMeasures(
              records as ReturnType<typeof normalizeMarketMeasure>[],
            ).then((result) => {
              conflictRejected = result.conflictRejected;
              return result;
            })
          : await this.store.persistActivities(
              records as ReturnType<typeof normalizeShortSellingActivity>[],
            );
      rejected += conflictRejected;
      await this.store.completeRun({
        runId: run.runId,
        sourceCursor: page.nextCursor,
        recordsRead: page.items.length,
        recordsAccepted: records.length - conflictRejected,
        recordsRejected: rejected,
      });
      return {
        replayed: false,
        ...persisted,
        rejected,
        nextCursor: page.nextCursor,
      };
    } catch (error) {
      await this.store.failRun(run.runId, 'MARKET_STRUCTURE_PROVIDER_FAILURE');
      throw error;
    }
  }

  private async persistNonConflictingMeasures(
    records: readonly ReturnType<typeof normalizeMarketMeasure>[],
  ) {
    const conflicts = findOverlappingMarketMeasureRevisions(records);
    const rejectedRevisionIds = new Set(
      conflicts.map(([, later]) => later.measure.revisionId),
    );
    const persisted = await this.store.persistMeasures(
      records.filter(
        (record) => !rejectedRevisionIds.has(record.measure.revisionId),
      ),
    );
    return { ...persisted, conflictRejected: rejectedRevisionIds.size };
  }

  private validate(input: RunInput) {
    if (
      input.to < input.from ||
      input.to.getTime() - input.from.getTime() > 31 * 86_400_000 ||
      input.limit < 1 ||
      input.limit > 500
    )
      throw new MarketStructureIngestionError(
        'MARKET_MEASURE_RANGE_INVALID',
        false,
      );
  }
}
