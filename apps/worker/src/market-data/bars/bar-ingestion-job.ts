import type { Job } from 'bullmq';
import { z } from 'zod';

import { marketDataTimeframeSchema } from '../providers/schemas';
import { BarIngestionService } from './bar-ingestion-service';

const barIngestionJobDataSchema = z
  .strictObject({
    providerCode: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    providerSymbol: z.string().trim().min(1).max(64),
    timeframe: marketDataTimeframeSchema,
    from: z.iso
      .datetime({ offset: true })
      .transform((value) => new Date(value)),
    to: z.iso.datetime({ offset: true }).transform((value) => new Date(value)),
    limit: z.number().int().min(1).max(10_000).optional(),
  })
  .refine((command) => command.to > command.from, {
    message: 'to must be after from',
    path: ['to'],
  });

export type BarIngestionJobData = z.input<typeof barIngestionJobDataSchema>;

export function processBarIngestionJob(
  job: Pick<Job, 'data'>,
  service: BarIngestionService,
) {
  return service.execute(barIngestionJobDataSchema.parse(job.data));
}
