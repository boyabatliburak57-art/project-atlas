import { normalizeKapDisclosure } from '@atlas/domain';

import type { KapDisclosureProvider, KapIngestionStore } from './contracts';

export class KapIngestionError extends Error {
  override readonly name = 'KapIngestionError';
  constructor(
    readonly code:
      | 'KAP_PROVIDER_REQUIRED'
      | 'KAP_IDENTITY_UNRESOLVED'
      | 'KAP_PAYLOAD_INVALID'
      | 'KAP_RANGE_INVALID',
    readonly retryable: boolean,
  ) {
    super(code);
  }
}

export class KapIngestionService {
  constructor(
    private readonly provider: KapDisclosureProvider,
    private readonly store: KapIngestionStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: {
    readonly from: Date;
    readonly to: Date;
    readonly cursor: string | null;
    readonly limit: number;
    readonly correlationId: string;
  }) {
    if (
      input.to < input.from ||
      input.to.getTime() - input.from.getTime() > 31 * 86_400_000 ||
      input.limit < 1 ||
      input.limit > 500
    )
      throw new KapIngestionError('KAP_RANGE_INVALID', false);
    const context = await this.store.resolveContext(
      this.provider.code,
      input.to,
    );
    if (!context) throw new KapIngestionError('KAP_PROVIDER_REQUIRED', false);
    const run = await this.store.beginRun({
      providerConnectionId: context.providerConnectionId,
      idempotencyKey: [
        this.provider.code,
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
        disclosuresInserted: 0,
        eventsInserted: 0,
        duplicates: 0,
        rejected: 0,
        nextCursor: input.cursor,
      };
    try {
      const page = await this.provider.fetchDisclosures({
        from: input.from,
        to: input.to,
        cursor: input.cursor,
        limit: input.limit,
      });
      const accepted = [];
      let rejected = 0;
      for (const item of page.items) {
        try {
          accepted.push(
            normalizeKapDisclosure(item, {
              providerId: context.providerId,
              providerDataset: this.provider.dataset,
              deliveryMode: this.provider.deliveryMode,
              license: this.provider.license,
              fetchedAt: this.now(),
              mappings: context.mappings,
              allowedSourceHosts: this.provider.allowedSourceHosts,
            }),
          );
        } catch {
          rejected += 1;
        }
      }
      const persisted = await this.store.persist(run.runId, accepted);
      await this.store.completeRun({
        runId: run.runId,
        sourceCursor: page.nextCursor,
        recordsRead: page.items.length,
        recordsAccepted: accepted.length,
        recordsRejected: rejected,
      });
      return {
        replayed: false,
        ...persisted,
        rejected,
        nextCursor: page.nextCursor,
      };
    } catch (error: unknown) {
      await this.store.failRun(
        run.runId,
        error instanceof KapIngestionError
          ? error.code
          : 'KAP_PROVIDER_FAILURE',
      );
      throw error;
    }
  }
}
