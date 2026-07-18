import { backtestDataSnapshots, type Database } from '@atlas/database';
import type { BacktestTimelineEvent } from '@atlas/domain';
import { eq } from 'drizzle-orm';

import type {
  BacktestResolvedDataSnapshot,
  BacktestWorkerSnapshotResolver,
} from './contracts';
import { BacktestWorkerError } from './errors';

export class PostgresBacktestSnapshotResolver implements BacktestWorkerSnapshotResolver {
  constructor(private readonly database: Database) {}

  async resolve(input: {
    readonly snapshotId: string;
    readonly expectedHash: string;
  }): Promise<BacktestResolvedDataSnapshot> {
    const rows = await this.database
      .select()
      .from(backtestDataSnapshots)
      .where(eq(backtestDataSnapshots.id, input.snapshotId))
      .limit(1);
    const row = rows[0];
    if (row === undefined)
      throw new BacktestWorkerError('BACKTEST_SNAPSHOT_NOT_FOUND', false);
    if (row.snapshotHash !== input.expectedHash)
      throw new BacktestWorkerError('BACKTEST_SNAPSHOT_MISMATCH', false);
    if (row.coverageStatus === 'not_evaluable')
      throw new BacktestWorkerError('BACKTEST_SNAPSHOT_NOT_EVALUABLE', false);
    const events = row.revisionManifest.events;
    if (!Array.isArray(events))
      throw new BacktestWorkerError('BACKTEST_SNAPSHOT_INVALID', false);
    return {
      id: row.id,
      hash: row.snapshotHash,
      dataCutoffAt: row.dataCutoffAt,
      events: events as readonly BacktestTimelineEvent[],
      qualityMetadata: row.qualityMetadata,
    };
  }
}
