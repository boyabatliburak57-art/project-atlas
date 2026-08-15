import {
  normalizeInstitutionalFlow,
  normalizeSettlementSnapshot,
} from '@atlas/domain';

import type {
  InstitutionalFlowProviderAdapter,
  InstitutionalIngestionStore,
  SettlementProviderAdapter,
} from './contracts';

export class InstitutionalIngestionError extends Error {
  override readonly name = 'InstitutionalIngestionError';
  constructor(
    readonly code:
      | 'INSTITUTIONAL_PROVIDER_REQUIRED'
      | 'SETTLEMENT_PROVIDER_REQUIRED'
      | 'INSTITUTIONAL_RANGE_INVALID',
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

export class InstitutionalIngestionService {
  constructor(
    private readonly flowProvider: InstitutionalFlowProviderAdapter | null,
    private readonly settlementProvider: SettlementProviderAdapter | null,
    private readonly store: InstitutionalIngestionStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async executeFlow(input: RunInput) {
    this.validate(input);
    const provider = this.flowProvider;
    if (!provider)
      throw new InstitutionalIngestionError(
        'INSTITUTIONAL_PROVIDER_REQUIRED',
        false,
      );
    const context = await this.store.resolveContext(provider.code, input.to);
    if (!context)
      throw new InstitutionalIngestionError(
        'INSTITUTIONAL_PROVIDER_REQUIRED',
        false,
      );
    const run = await this.begin(
      input,
      context.providerConnectionId,
      'institutional.akd',
      provider.code,
    );
    if (run.completed) return replay(input.cursor);
    try {
      const page = await provider.fetchInstitutionalFlows(input);
      const accepted = [];
      let rejected = 0;
      for (const item of page.items) {
        try {
          accepted.push(
            normalizeInstitutionalFlow(item, {
              providerId: context.providerId,
              providerDataset: provider.dataset,
              fetchedAt: this.now(),
              deliveryMode: provider.deliveryMode,
              license: provider.license,
              mappings: context.mappings,
            }),
          );
        } catch {
          rejected += 1;
        }
      }
      const persisted = await this.store.persistFlows(run.runId, accepted);
      await this.finish(
        run.runId,
        page.nextCursor,
        page.items.length,
        accepted.length,
        rejected,
      );
      return {
        replayed: false,
        ...persisted,
        rejected,
        nextCursor: page.nextCursor,
      };
    } catch (error) {
      await this.store.failRun(run.runId, 'INSTITUTIONAL_PROVIDER_FAILURE');
      throw error;
    }
  }

  async executeSettlement(input: RunInput) {
    this.validate(input);
    const provider = this.settlementProvider;
    if (!provider)
      throw new InstitutionalIngestionError(
        'SETTLEMENT_PROVIDER_REQUIRED',
        false,
      );
    const context = await this.store.resolveContext(provider.code, input.to);
    if (!context)
      throw new InstitutionalIngestionError(
        'SETTLEMENT_PROVIDER_REQUIRED',
        false,
      );
    const run = await this.begin(
      input,
      context.providerConnectionId,
      'settlement.snapshot',
      provider.code,
    );
    if (run.completed) return replay(input.cursor);
    try {
      const page = await provider.fetchSettlements(input);
      const accepted = [];
      let rejected = 0;
      for (const item of page.items) {
        try {
          accepted.push(
            normalizeSettlementSnapshot(item, {
              providerId: context.providerId,
              providerDataset: provider.dataset,
              fetchedAt: this.now(),
              deliveryMode: provider.deliveryMode,
              license: provider.license,
              mappings: context.mappings,
            }),
          );
        } catch {
          rejected += 1;
        }
      }
      const persisted = await this.store.persistSettlements(
        run.runId,
        accepted,
      );
      await this.finish(
        run.runId,
        page.nextCursor,
        page.items.length,
        accepted.length,
        rejected,
      );
      return {
        replayed: false,
        ...persisted,
        rejected,
        nextCursor: page.nextCursor,
      };
    } catch (error) {
      await this.store.failRun(run.runId, 'SETTLEMENT_PROVIDER_FAILURE');
      throw error;
    }
  }

  private validate(input: RunInput) {
    if (
      input.to < input.from ||
      input.to.getTime() - input.from.getTime() > 31 * 86_400_000 ||
      input.limit < 1 ||
      input.limit > 500
    )
      throw new InstitutionalIngestionError(
        'INSTITUTIONAL_RANGE_INVALID',
        false,
      );
  }
  private begin(
    input: RunInput,
    providerConnectionId: string,
    capability: 'institutional.akd' | 'settlement.snapshot',
    providerCode: string,
  ) {
    return this.store.beginRun({
      providerConnectionId,
      capability,
      idempotencyKey: [
        capability,
        providerCode,
        input.from.toISOString(),
        input.to.toISOString(),
        input.cursor ?? 'START',
      ].join(':'),
      correlationId: input.correlationId,
      sourceCursor: input.cursor,
    });
  }
  private finish(
    runId: string,
    sourceCursor: string | null,
    recordsRead: number,
    recordsAccepted: number,
    recordsRejected: number,
  ) {
    return this.store.completeRun({
      runId,
      sourceCursor,
      recordsRead,
      recordsAccepted,
      recordsRejected,
    });
  }
}
function replay(nextCursor: string | null) {
  return {
    replayed: true,
    inserted: 0,
    duplicates: 0,
    rejected: 0,
    nextCursor,
  };
}
