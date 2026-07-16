import { createDatabase, type Database } from '@atlas/database';
import type { AlertEvaluationQueuePayload } from '@atlas/types';
import { type Job, type Queue, UnrecoverableError } from 'bullmq';
import { z } from 'zod';

import type { WorkerEnvironment } from '../config/environment';
import type { StructuredLogger } from '../observability/structured-logger';
import { enqueueAlertEvaluation } from '../queue/alert-queue';
import { JOB_NAMES } from '../queue/queue-contracts';
import { AlertEvaluationProcessor } from './alert-evaluation-processor';
import type {
  AlertEvaluationRepository,
  AlertMetrics,
  AlertSourceEvaluator,
  AlertTriggerSink,
} from './contracts';
import { isAlertErrorRetryable } from './errors';
import { InMemoryAlertMetrics } from './metrics';
import { PostgresAlertEvaluationRepository } from './postgres-alert-evaluation-repository';
import { PostgresAlertSourceEvaluator } from './postgres-alert-source-evaluator';

const eventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('market_data_updated'),
    eventId: z.string().min(1).max(160),
    instrumentId: z.uuid(),
    timeframe: z.string().min(1).max(16),
    barOpenTime: z.iso.datetime({ offset: true }),
    dataCutoffAt: z.iso.datetime({ offset: true }),
    isClosed: z.boolean(),
  }),
  z.object({
    type: z.literal('scan_completed'),
    eventId: z.string().min(1).max(160),
    scanRunId: z.uuid(),
    dataCutoffAt: z.iso.datetime({ offset: true }),
  }),
]);

export interface AlertComposition {
  readonly process: (job: Job<AlertEvaluationQueuePayload>) => Promise<unknown>;
  readonly catchUp: (
    queue: Queue<AlertEvaluationQueuePayload>,
  ) => Promise<number>;
  readonly close: () => Promise<void>;
}

export function createAlertComposition(options: {
  readonly database: Database;
  readonly logger: StructuredLogger;
  readonly repository?: AlertEvaluationRepository | undefined;
  readonly evaluator?: AlertSourceEvaluator | undefined;
  readonly metrics?: AlertMetrics | undefined;
  readonly catchUpLimit?: number | undefined;
  readonly triggerSink?: AlertTriggerSink | undefined;
  readonly close?: (() => Promise<void>) | undefined;
}): AlertComposition {
  const repository =
    options.repository ??
    new PostgresAlertEvaluationRepository(options.database);
  const processor = new AlertEvaluationProcessor({
    repository,
    evaluator:
      options.evaluator ?? new PostgresAlertSourceEvaluator(options.database),
    metrics: options.metrics ?? new InMemoryAlertMetrics(),
    logger: options.logger,
    triggerSink: options.triggerSink,
  });
  return {
    async process(job) {
      if (job.name !== JOB_NAMES.alertEvaluate) {
        throw new UnrecoverableError(`Unsupported alert job: ${job.name}`);
      }
      const parsed = eventSchema.safeParse(job.data);
      if (!parsed.success) throw new UnrecoverableError('ALERT_EVENT_INVALID');
      try {
        return await processor.process(parsed.data);
      } catch (error: unknown) {
        const retryable = isAlertErrorRetryable(error);
        options.logger.error('worker.alert.evaluation.failed', {
          errorType:
            error instanceof Error ? error.constructor.name : 'UnknownError',
          eventId: parsed.data.eventId,
          retryable,
        });
        if (!retryable && !(error instanceof UnrecoverableError)) {
          throw new UnrecoverableError(
            error instanceof Error ? error.message : 'ALERT_EVALUATION_FAILED',
          );
        }
        throw error;
      }
    },
    async catchUp(queue) {
      const events = await repository.listCatchUpEvents(
        options.catchUpLimit ?? 1_000,
      );
      for (const event of events) await enqueueAlertEvaluation(queue, event);
      if (events.length > 0) {
        options.logger.info('worker.alert.catch_up.enqueued', {
          eventCount: events.length,
        });
      }
      return events.length;
    },
    close: options.close ?? (() => Promise.resolve()),
  };
}

export function createDefaultAlertComposition(
  environment: WorkerEnvironment,
  logger: StructuredLogger,
  triggerSink?: AlertTriggerSink,
): AlertComposition {
  const { db, pool } = createDatabase(environment.DATABASE_URL);
  return createAlertComposition({
    database: db,
    logger,
    triggerSink,
    close: () => pool.end(),
  });
}
