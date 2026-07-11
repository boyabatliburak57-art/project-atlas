import { ProviderError, type ProviderInstrumentDto } from '../providers';
import type {
  InstrumentImportCommand,
  InstrumentImportDependencies,
  InstrumentImportResult,
} from './contracts';
import { planInstrumentImport } from './normalize-instruments';

export class InstrumentImportError extends Error {
  override readonly name = 'InstrumentImportError';

  constructor(readonly code: 'PROVIDER_NOT_ACTIVE') {
    super('Provider is not active for instrument import');
  }
}

export class InstrumentImportService {
  constructor(private readonly dependencies: InstrumentImportDependencies) {}

  async execute(
    command: InstrumentImportCommand,
  ): Promise<InstrumentImportResult> {
    const providerId = await this.dependencies.store.findActiveProviderId(
      command.providerCode,
    );
    if (providerId === null) {
      throw new InstrumentImportError('PROVIDER_NOT_ACTIVE');
    }

    const runId = command.dryRun
      ? null
      : await this.dependencies.store.createRun(providerId);
    let providerInstruments: readonly ProviderInstrumentDto[];
    try {
      providerInstruments = await this.dependencies.listInstruments(
        command.providerCode,
      );
    } catch (error: unknown) {
      const errorCode =
        error instanceof ProviderError
          ? error.code
          : 'INSTRUMENT_IMPORT_FAILED';
      if (runId !== null) {
        await this.dependencies.store.failRun(runId, errorCode);
      }
      this.dependencies.logger.error('market-data.instrument-import.failed', {
        errorCode,
        providerCode: command.providerCode,
        runId,
      });
      throw error;
    }

    const plan = planInstrumentImport(providerInstruments);
    const fetchedCount = providerInstruments.length;

    if (command.dryRun) {
      const changes = await this.dependencies.store.previewImport(
        providerId,
        plan.instruments,
      );
      const result = this.toResult(
        command,
        null,
        fetchedCount,
        plan.rejections,
        changes,
      );
      this.logCompleted(result);
      return result;
    }

    if (runId === null) {
      throw new Error('A persisted import requires an ingestion run');
    }

    try {
      const changes = await this.dependencies.store.applyImport(
        runId,
        providerId,
        plan.instruments,
        fetchedCount,
        plan.rejections.length,
      );
      const result = this.toResult(
        command,
        runId,
        fetchedCount,
        plan.rejections,
        changes,
      );
      this.logCompleted(result);
      return result;
    } catch (error: unknown) {
      await this.dependencies.store.failRun(runId, 'INSTRUMENT_IMPORT_FAILED');
      this.dependencies.logger.error('market-data.instrument-import.failed', {
        errorCode: 'INSTRUMENT_IMPORT_FAILED',
        providerCode: command.providerCode,
        runId,
      });
      throw error;
    }
  }

  private toResult(
    command: InstrumentImportCommand,
    runId: string | null,
    fetchedCount: number,
    rejections: InstrumentImportResult['rejections'],
    changes: Pick<
      InstrumentImportResult,
      | 'createdCount'
      | 'updatedCount'
      | 'mappingCreatedCount'
      | 'mappingUpdatedCount'
      | 'deactivationCandidates'
    >,
  ): InstrumentImportResult {
    return {
      ...changes,
      providerCode: command.providerCode,
      runId,
      dryRun: command.dryRun,
      fetchedCount,
      acceptedCount: fetchedCount - rejections.length,
      rejectedCount: rejections.length,
      rejections,
    };
  }

  private logCompleted(result: InstrumentImportResult): void {
    this.dependencies.logger.info('market-data.instrument-import.completed', {
      acceptedCount: result.acceptedCount,
      createdCount: result.createdCount,
      deactivationCandidateCount: result.deactivationCandidates.length,
      dryRun: result.dryRun,
      fetchedCount: result.fetchedCount,
      mappingCreatedCount: result.mappingCreatedCount,
      providerCode: result.providerCode,
      rejectedCount: result.rejectedCount,
      runId: result.runId,
      updatedCount: result.updatedCount,
    });
  }
}
