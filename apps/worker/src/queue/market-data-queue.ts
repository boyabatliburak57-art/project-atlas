import type { JobsOptions, Queue } from 'bullmq';

import type { BarIngestionJobData } from '../market-data/bars/bar-ingestion-job';
import type { InstrumentImportJobData } from '../market-data/instruments/instrument-import-job';
import type { KapIngestionJobData } from '../intelligence/kap';
import type { InstitutionalIngestionJobData } from '../intelligence/institutional';
import type { MarketStructureIngestionJobData } from '../intelligence/market-structure';
import {
  createBarIngestionJobId,
  createInstrumentSyncJobId,
  createKapIngestionJobId,
  createInstitutionalFlowJobId,
  createSettlementJobId,
  createMarketStructureJobId,
  JOB_NAMES,
} from './queue-contracts';

export function enqueueMarketStructureSync(
  queue: Queue,
  data: MarketStructureIngestionJobData,
  options: JobsOptions = {},
) {
  return queue.add(JOB_NAMES.marketMeasureSync, data, {
    ...options,
    jobId: createMarketStructureJobId(data),
  });
}

export function enqueueInstrumentSync(
  queue: Queue,
  data: InstrumentImportJobData,
  idempotencyKey: string,
  options: JobsOptions = {},
) {
  return queue.add(JOB_NAMES.instrumentSync, data, {
    ...options,
    jobId: createInstrumentSyncJobId(data.providerCode, idempotencyKey),
  });
}

export function enqueueInstitutionalFlowSync(
  queue: Queue,
  data: InstitutionalIngestionJobData,
  options: JobsOptions = {},
) {
  return queue.add(JOB_NAMES.institutionalFlowSync, data, {
    ...options,
    jobId: createInstitutionalFlowJobId(data),
  });
}

export function enqueueSettlementSync(
  queue: Queue,
  data: InstitutionalIngestionJobData,
  options: JobsOptions = {},
) {
  return queue.add(JOB_NAMES.settlementSync, data, {
    ...options,
    jobId: createSettlementJobId(data),
  });
}

export function enqueueKapDisclosureSync(
  queue: Queue,
  data: KapIngestionJobData,
  options: JobsOptions = {},
) {
  return queue.add(JOB_NAMES.kapDisclosureSync, data, {
    ...options,
    jobId: createKapIngestionJobId(data),
  });
}

export function enqueueBarIngestion(
  queue: Queue,
  data: BarIngestionJobData,
  options: JobsOptions = {},
) {
  return queue.add(JOB_NAMES.barIngestion, data, {
    ...options,
    jobId: createBarIngestionJobId(data),
  });
}
