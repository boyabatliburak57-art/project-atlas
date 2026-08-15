import type { Job } from 'bullmq';
import { z } from 'zod';

import { KapIngestionService } from './kap-ingestion-service';

const schema = z.strictObject({
  providerCode: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  from: z.iso.datetime(),
  to: z.iso.datetime(),
  cursor: z.string().max(512).nullable().default(null),
  limit: z.number().int().min(1).max(500).default(200),
  correlationId: z.string().trim().min(1).max(128),
});
export type KapIngestionJobData = z.input<typeof schema>;

export function processKapIngestionJob(
  job: Pick<Job, 'data'>,
  service: KapIngestionService,
) {
  const data = schema.parse(job.data);
  return service.execute({
    ...data,
    from: new Date(data.from),
    to: new Date(data.to),
  });
}
