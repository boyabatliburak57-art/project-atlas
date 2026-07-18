import { createDatabase } from '@atlas/database';
import {
  DeterministicBacktestEngine,
  ScannerBacktestSignalEvaluator,
} from '@atlas/domain';
import type { Job } from 'bullmq';
import { UnrecoverableError } from 'bullmq';

import type { WorkerEnvironment } from '../config/environment';
import type { StructuredLogger } from '../observability/structured-logger';
import { JOB_NAMES } from '../queue/queue-contracts';
import { BacktestRunProcessor } from './backtest-run-processor';
import type { BacktestRunJobData } from './contracts';
import { normalizeBacktestWorkerError } from './errors';
import { InMemoryBacktestRuntimeMetrics } from './metrics';
import { PostgresBacktestRuntimeRepository } from './postgres-backtest-runtime-repository';
import { PostgresBacktestSnapshotResolver } from './postgres-backtest-snapshot-resolver';

export interface BacktestComposition {
  process(job: Job<BacktestRunJobData>): Promise<unknown>;
  close(): Promise<void>;
}

export function createDefaultBacktestComposition(
  environment: WorkerEnvironment,
  logger: StructuredLogger,
): BacktestComposition {
  const { db, pool } = createDatabase(environment.DATABASE_URL);
  const repository = new PostgresBacktestRuntimeRepository(db);
  const processor = new BacktestRunProcessor({
    repository,
    snapshotResolver: new PostgresBacktestSnapshotResolver(db),
    engine: new DeterministicBacktestEngine(
      new ScannerBacktestSignalEvaluator(),
    ),
    metrics: new InMemoryBacktestRuntimeMetrics(),
    logger,
    eventBatchSize: environment.BACKTEST_EVENT_BATCH_SIZE,
    runTimeoutMs: environment.BACKTEST_RUN_TIMEOUT_MS,
  });
  return {
    async process(job) {
      if (job.name !== JOB_NAMES.backtestRun)
        throw new UnrecoverableError('Unsupported backtest job type');
      try {
        return await processor.process(job);
      } catch (error: unknown) {
        const normalized = normalizeBacktestWorkerError(error);
        const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
        if (!normalized.retryable || isFinalAttempt) {
          await repository.failRun({
            runId: job.data.runId,
            status:
              normalized.code === 'BACKTEST_RUN_TIMEOUT' ? 'expired' : 'failed',
            errorCode: normalized.code,
            occurredAt: new Date(),
          });
        }
        logger.error('worker.backtest.run.failed', {
          attempt: job.attemptsMade + 1,
          errorCode: normalized.code,
          retryable: normalized.retryable,
          runId: job.data.runId,
        });
        if (!normalized.retryable)
          throw new UnrecoverableError(normalized.code);
        throw normalized;
      }
    },
    async close() {
      await pool.end();
    },
  };
}
