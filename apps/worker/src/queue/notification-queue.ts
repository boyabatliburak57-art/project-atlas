import type { NotificationDeliveryQueuePayload } from '@atlas/types';
import type { JobsOptions, Queue } from 'bullmq';

import { createNotificationDeliveryJobId, JOB_NAMES } from './queue-contracts';

export function enqueueNotificationDelivery(
  queue: Queue<NotificationDeliveryQueuePayload>,
  data: NotificationDeliveryQueuePayload,
  options: JobsOptions = {},
) {
  return queue.add(JOB_NAMES.notificationDeliver, data, {
    ...options,
    jobId: createNotificationDeliveryJobId(data),
  });
}
