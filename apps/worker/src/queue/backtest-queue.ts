import type { BacktestRunDispatcher } from '@atlas/domain';
import type { BacktestRunQueuePayload } from '@atlas/types';
import type { Queue } from 'bullmq';

import {
  createBacktestRunJobId,
  DEFAULT_JOB_OPTIONS,
  JOB_NAMES,
} from './queue-contracts';

export class BullMqBacktestRunDispatcher implements BacktestRunDispatcher {
  constructor(private readonly queue: Queue<BacktestRunQueuePayload>) {}

  async dispatch(input: BacktestRunQueuePayload): Promise<void> {
    await this.queue.add(JOB_NAMES.backtestRun, input, {
      ...DEFAULT_JOB_OPTIONS,
      jobId: createBacktestRunJobId(input.runId),
    });
  }
}
