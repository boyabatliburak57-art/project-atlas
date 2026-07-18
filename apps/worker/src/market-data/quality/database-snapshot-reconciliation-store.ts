import {
  marketOverviewSnapshots,
  marketRankSnapshots,
  sectorMarketSnapshots,
  type Database,
} from '@atlas/database';
import { sql } from 'drizzle-orm';

export interface SnapshotReconciliationView {
  readonly generationId: string;
  readonly market: string;
  readonly timeframe: string;
  readonly universeVersion: string;
  readonly policyVersion: string;
  readonly dataCutoffAt: Date;
  readonly sourceTimestamp: Date | null;
  readonly status: 'complete' | 'partial' | 'stale' | 'notEvaluable';
  readonly evaluatedCount: number;
  readonly excludedCount: number;
  readonly sectorCount: number;
  readonly rankingCount: number;
  readonly generationConsistent: boolean;
  readonly queryCount: 1;
}

export interface SnapshotReconciliationStore {
  reconcile(
    market: string,
    timeframe: string,
  ): Promise<SnapshotReconciliationView | null>;
}

interface ReconciliationRow {
  readonly [key: string]: unknown;
  readonly generation_id: string;
  readonly market_code: string;
  readonly timeframe: string;
  readonly universe_version: string;
  readonly policy_version: string;
  readonly data_cutoff_at: Date | string;
  readonly source_timestamp: Date | string | null;
  readonly status: string;
  readonly evaluated_count: number;
  readonly excluded_count: number;
  readonly sector_count: string;
  readonly ranking_count: string;
  readonly mismatched_count: string;
}

export class DatabaseSnapshotReconciliationStore implements SnapshotReconciliationStore {
  constructor(private readonly database: Database) {}

  async reconcile(market: string, timeframe: string) {
    const result = await this.database.execute<ReconciliationRow>(sql`
      with latest as (
        select *
        from ${marketOverviewSnapshots}
        where ${marketOverviewSnapshots.marketCode} = ${market}
          and ${marketOverviewSnapshots.timeframe} = ${timeframe}
          and ${marketOverviewSnapshots.status} <> 'invalidated'
        order by ${marketOverviewSnapshots.dataCutoffAt} desc,
                 ${marketOverviewSnapshots.createdAt} desc,
                 ${marketOverviewSnapshots.id} desc
        limit 1
      )
      select
        latest.generation_id,
        latest.market_code,
        latest.timeframe,
        latest.universe_version,
        latest.policy_version,
        latest.data_cutoff_at,
        latest.source_timestamp,
        latest.status,
        latest.evaluated_count,
        latest.excluded_count,
        (select count(*)::text from ${sectorMarketSnapshots} sector
          where sector.generation_id = latest.generation_id) as sector_count,
        (select count(*)::text from ${marketRankSnapshots} ranking
          where ranking.generation_id = latest.generation_id) as ranking_count,
        ((select count(*) from ${sectorMarketSnapshots} sector
          where sector.generation_id = latest.generation_id
            and (sector.market_code <> latest.market_code
              or sector.timeframe <> latest.timeframe
              or sector.policy_version <> latest.policy_version
              or sector.data_cutoff_at <> latest.data_cutoff_at))
        + (select count(*) from ${marketRankSnapshots} ranking
          where ranking.generation_id = latest.generation_id
            and (ranking.market_code <> latest.market_code
              or ranking.timeframe <> latest.timeframe
              or ranking.policy_version <> latest.policy_version
              or ranking.data_cutoff_at <> latest.data_cutoff_at)))::text
          as mismatched_count
      from latest
    `);
    const row = result.rows[0];
    if (!row) return null;
    return {
      generationId: row.generation_id,
      market: row.market_code,
      timeframe: row.timeframe,
      universeVersion: row.universe_version,
      policyVersion: row.policy_version,
      dataCutoffAt: asDate(row.data_cutoff_at),
      sourceTimestamp:
        row.source_timestamp === null ? null : asDate(row.source_timestamp),
      status: publicStatus(row.status),
      evaluatedCount: row.evaluated_count,
      excludedCount: row.excluded_count,
      sectorCount: Number(row.sector_count),
      rankingCount: Number(row.ranking_count),
      generationConsistent: Number(row.mismatched_count) === 0,
      queryCount: 1 as const,
    };
  }
}

function asDate(value: Date | string): Date {
  const result = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(result.getTime()))
    throw new Error('MARKET_SNAPSHOT_TIMESTAMP_INVALID');
  return result;
}

function publicStatus(value: string): SnapshotReconciliationView['status'] {
  if (value === 'not_evaluable') return 'notEvaluable';
  if (value === 'partial' || value === 'stale') return value;
  return 'complete';
}
