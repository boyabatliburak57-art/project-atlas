import {
  ATLAS_JOB_NAMES,
  ATLAS_QUEUE_NAMES,
  type ReportGenerationQueuePayload,
} from '@atlas/types';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { createHash } from 'node:crypto';

@Injectable()
export class ReportsDispatcher implements OnApplicationShutdown {
  private readonly queue: Queue<ReportGenerationQueuePayload>;

  constructor(config: ConfigService) {
    this.queue = new Queue(ATLAS_QUEUE_NAMES.reports, {
      connection: { url: config.getOrThrow<string>('REDIS_URL') },
      defaultJobOptions: {
        attempts: 5,
        backoff: { delay: 1_000, type: 'exponential' },
        removeOnComplete: 100,
        removeOnFail: false,
      },
    });
  }

  async dispatch(payload: ReportGenerationQueuePayload): Promise<void> {
    const jobId = `report-${createHash('sha256').update(payload.reportId).digest('hex').slice(0, 32)}`;
    await this.queue.add(ATLAS_JOB_NAMES.reportGenerate, payload, { jobId });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.queue.close();
  }
}
