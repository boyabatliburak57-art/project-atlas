import type { Job } from 'bullmq';
import { z } from 'zod';
import type { MarketIntelligenceReconciliationQueuePayload } from '@atlas/types';
import type { SnapshotReconciliationService } from './snapshot-reconciliation-service';

const eventSchema = z.object({
  eventId: z.string().trim().min(1).max(128),
  type: z.enum([
    'new_closed_bar',
    'corrected_price_bar',
    'corporate_action_revision',
    'financial_restatement',
    'ratio_formula_version',
    'indicator_version',
    'pattern_algorithm_version',
    'instrument_classification_change',
    'user_marker_ownership_change',
  ]),
  instrumentId: z.uuid().optional(),
  market: z.string().trim().min(1).max(32).optional(),
  userId: z.uuid().optional(),
  version: z.string().trim().min(1).max(128),
  occurredAt: z.iso.datetime(),
});
const schema = z.object({
  market: z.string().trim().min(1).max(32),
  timeframe: z.string().trim().min(1).max(16),
  staleAfterMs: z.number().int().min(0).max(31_536_000_000),
  invalidations: z.array(eventSchema).max(100),
  correlationId: z.string().trim().min(1).max(128).optional(),
});

export function processSnapshotReconciliationJob(
  job: Job,
  service: SnapshotReconciliationService,
) {
  return service.execute(
    schema.parse(job.data) as MarketIntelligenceReconciliationQueuePayload,
  );
}
