import type { Job } from 'bullmq';
import { z } from 'zod';

import { InstrumentImportService } from './instrument-import-service';

const instrumentImportJobDataSchema = z.strictObject({
  providerCode: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  dryRun: z.boolean().default(false),
});

export type InstrumentImportJobData = z.input<
  typeof instrumentImportJobDataSchema
>;

export function processInstrumentImportJob(
  job: Pick<Job, 'data'>,
  service: InstrumentImportService,
) {
  return service.execute(instrumentImportJobDataSchema.parse(job.data));
}
