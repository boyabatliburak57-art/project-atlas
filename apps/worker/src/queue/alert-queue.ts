import type { AlertEvaluationQueuePayload } from '@atlas/types';
import type { JobsOptions, Queue } from 'bullmq';

import { createAlertEvaluationJobId, JOB_NAMES } from './queue-contracts';

export function enqueueAlertEvaluation(
  queue: Queue<AlertEvaluationQueuePayload>,
  data: AlertEvaluationQueuePayload,
  options: JobsOptions = {},
) {
  return queue.add(JOB_NAMES.alertEvaluate, data, {
    ...options,
    jobId: createAlertEvaluationJobId(data),
  });
}
