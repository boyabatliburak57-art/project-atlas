import type { Job } from 'bullmq';
import { z } from 'zod';
import { PatternDetectionService } from './pattern-detection-service';

const schema = z.strictObject({
  instrumentIds: z.array(z.uuid()).min(1).max(1000),
  timeframe: z.enum(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w']),
  adjustmentMode: z.enum(['raw', 'split-adjusted', 'total-return']),
  dataCutoffAt: z.iso
    .datetime({ offset: true })
    .transform((value) => new Date(value)),
  correlationId: z.string().trim().min(1).max(128).optional(),
});
export type PatternDetectionJobData = z.input<typeof schema>;
export function processPatternDetectionJob(
  job: Pick<Job, 'data'>,
  service: PatternDetectionService,
) {
  return service.execute(schema.parse(job.data));
}
