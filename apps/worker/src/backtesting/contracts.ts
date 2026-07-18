import type {
  BacktestCheckpoint,
  BacktestExecutionPlan,
  BacktestResult,
  BacktestRunStatus,
  BacktestTimelineEvent,
} from '@atlas/domain';
import type { BacktestRunQueuePayload } from '@atlas/types';

export type BacktestRunJobData = BacktestRunQueuePayload;

export interface BacktestWorkerRun {
  readonly id: string;
  readonly requestedBy: string;
  readonly status: BacktestRunStatus;
  readonly executionPlan: BacktestExecutionPlan;
  readonly dataSnapshotId: string;
  readonly dataSnapshotHash: string;
  readonly queuedAt: Date;
  readonly startedAt: Date | null;
  readonly progressPercent: number;
  readonly checkpoint: BacktestCheckpoint | null;
}

export interface BacktestResolvedDataSnapshot {
  readonly id: string;
  readonly hash: string;
  readonly dataCutoffAt: Date;
  readonly events: readonly BacktestTimelineEvent[];
  readonly qualityMetadata: Readonly<Record<string, unknown>>;
}

export interface BacktestWorkerRepository {
  loadRun(runId: string): Promise<BacktestWorkerRun | null>;
  transition(input: {
    readonly runId: string;
    readonly from: readonly BacktestRunStatus[];
    readonly to: BacktestRunStatus;
    readonly occurredAt: Date;
    readonly progressPercent?: number | undefined;
    readonly errorCode?: string | undefined;
  }): Promise<BacktestWorkerRun | null>;
  isCancellationRequested(runId: string): Promise<boolean>;
  saveCheckpoint(input: {
    readonly runId: string;
    readonly checkpoint: BacktestCheckpoint;
    readonly progressPercent: number;
    readonly occurredAt: Date;
  }): Promise<void>;
  persistCompletedResult(input: {
    readonly run: BacktestWorkerRun;
    readonly result: BacktestResult;
    readonly completedAt: Date;
  }): Promise<void>;
  failRun(input: {
    readonly runId: string;
    readonly status: 'failed' | 'expired';
    readonly errorCode: string;
    readonly occurredAt: Date;
  }): Promise<void>;
}

export interface BacktestWorkerSnapshotResolver {
  resolve(input: {
    readonly snapshotId: string;
    readonly expectedHash: string;
  }): Promise<BacktestResolvedDataSnapshot>;
}

export interface BacktestRuntimeMetrics {
  increment(
    name: string,
    value?: number,
    tags?: Readonly<Record<string, string>>,
  ): void;
  observe(
    name: string,
    value: number,
    tags?: Readonly<Record<string, string>>,
  ): void;
}

export interface BacktestProgress {
  readonly phase:
    | 'resolvingData'
    | 'running'
    | 'calculatingMetrics'
    | 'completed'
    | 'cancelled';
  readonly percent: number;
  readonly processedEvents: number;
  readonly totalEvents: number;
  readonly updatedAt: string;
}
