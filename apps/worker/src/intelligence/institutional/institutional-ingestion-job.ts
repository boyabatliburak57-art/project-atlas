import type { Job } from 'bullmq';
import { z } from 'zod';

import { InstitutionalIngestionService } from './institutional-ingestion-service';

const schema = z.strictObject({
  providerCode: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  from: z.iso.datetime(),
  to: z.iso.datetime(),
  cursor: z.string().max(512).nullable().default(null),
  limit: z.number().int().min(1).max(500).default(200),
  correlationId: z.string().trim().min(1).max(128),
});
export type InstitutionalIngestionJobData = z.input<typeof schema>;

export function processInstitutionalFlowJob(
  job: Pick<Job, 'data'>,
  service: InstitutionalIngestionService,
) {
  const data = schema.parse(job.data);
  return service.executeFlow({
    ...data,
    from: new Date(data.from),
    to: new Date(data.to),
  });
}
export function processSettlementJob(
  job: Pick<Job, 'data'>,
  service: InstitutionalIngestionService,
) {
  const data = schema.parse(job.data);
  return service.executeSettlement({
    ...data,
    from: new Date(data.from),
    to: new Date(data.to),
  });
}
