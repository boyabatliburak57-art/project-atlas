import type { Job } from 'bullmq';
import { z } from 'zod';
import { MarketStructureIngestionService } from './market-structure-ingestion-service';

const schema = z.strictObject({
  providerCode: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  from: z.iso.datetime(),
  to: z.iso.datetime(),
  cursor: z.string().max(512).nullable().default(null),
  limit: z.number().int().min(1).max(500).default(200),
  correlationId: z.string().trim().min(1).max(128),
  dataset: z.enum(['MEASURES', 'SHORT_SELLING_ACTIVITY']).default('MEASURES'),
});
export type MarketStructureIngestionJobData = z.input<typeof schema>;
export function processMarketStructureJob(
  job: Pick<Job, 'data'>,
  service: MarketStructureIngestionService,
) {
  const data = schema.parse(job.data);
  const input = { ...data, from: new Date(data.from), to: new Date(data.to) };
  return data.dataset === 'MEASURES'
    ? service.executeMeasures(input)
    : service.executeActivity(input);
}
