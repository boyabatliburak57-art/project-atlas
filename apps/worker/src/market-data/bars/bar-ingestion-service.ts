import { ProviderError } from '../providers';
import type {
  BarIngestionDependencies,
  BarIngestionResult,
  FetchBarRangeCommand,
} from './contracts';
import { validateBars } from './validate-bars';

export class BarIngestionError extends Error {
  override readonly name = 'BarIngestionError';

  constructor(readonly code: 'PROVIDER_NOT_ACTIVE') {
    super('Provider is not active for bar ingestion');
  }
}

export class BarIngestionService {
  constructor(private readonly dependencies: BarIngestionDependencies) {}

  async execute(command: FetchBarRangeCommand): Promise<BarIngestionResult> {
    const providerId = await this.dependencies.store.findActiveProviderId(
      command.providerCode,
    );
    if (providerId === null) {
      throw new BarIngestionError('PROVIDER_NOT_ACTIVE');
    }

    const instrumentId = await this.dependencies.store.findActiveInstrumentId(
      providerId,
      command.providerSymbol,
    );
    const runId = await this.dependencies.store.createRun(providerId, command);
    const startedAt = Date.now();

    try {
      const batch = await this.dependencies.fetchBars(command.providerCode, {
        providerSymbol: command.providerSymbol,
        timeframe: command.timeframe,
        from: command.from,
        to: command.to,
        ...(command.limit === undefined ? {} : { limit: command.limit }),
      });
      const context = { providerId, instrumentId, command };
      const validation = validateBars(
        batch.bars,
        context,
        this.dependencies.now?.() ?? new Date(),
      );
      const persistence = await this.dependencies.store.persistBatch(
        runId,
        context,
        batch.bars.length,
        validation.accepted,
        validation.rejected,
      );
      const result: BarIngestionResult = {
        ...persistence,
        runId,
        providerCode: command.providerCode,
        providerSymbol: command.providerSymbol,
        timeframe: command.timeframe,
        fetchedCount: batch.bars.length,
        acceptedCount:
          persistence.insertedCount +
          persistence.updatedOpenCount +
          persistence.revisedClosedCount,
        durationMs: Date.now() - startedAt,
      };

      this.dependencies.logger.info('market-data.bar-ingestion.completed', {
        acceptedCount: result.acceptedCount,
        duplicateCount: result.duplicateCount,
        durationMs: result.durationMs,
        fetchedCount: result.fetchedCount,
        insertedCount: result.insertedCount,
        providerCode: result.providerCode,
        qualityIssueCount: result.qualityIssueCount,
        rejectedCount: result.rejectedCount,
        revisedClosedCount: result.revisedClosedCount,
        runId: result.runId,
        timeframe: result.timeframe,
        updatedOpenCount: result.updatedOpenCount,
      });
      return result;
    } catch (error: unknown) {
      const errorCode =
        error instanceof ProviderError ? error.code : 'BAR_INGESTION_FAILED';
      await this.dependencies.store.failRun(runId, providerId, errorCode);
      this.dependencies.logger.error('market-data.bar-ingestion.failed', {
        errorCode,
        providerCode: command.providerCode,
        runId,
        timeframe: command.timeframe,
      });
      throw error;
    }
  }
}
