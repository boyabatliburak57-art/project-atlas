import type { Job } from 'bullmq';
import { z } from 'zod';
import { FundamentalsIngestionService } from './fundamentals-ingestion-service';

const schema = z.strictObject({
  providerCode: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  providerSymbol: z.string().trim().min(1).max(128),
  correlationId: z.string().trim().min(1).max(128).optional(),
});
export type FundamentalsIngestionJobData = z.input<typeof schema>;
export function processFundamentalsIngestionJob(
  job: Pick<Job, 'data'>,
  service: FundamentalsIngestionService,
) {
  const data = schema.parse(job.data);
  return service.execute(data.providerSymbol);
}
