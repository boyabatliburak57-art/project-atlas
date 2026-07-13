import type {
  IdempotentScanRunCreation,
  NewScanRun,
  ScanExecutionPlan,
  ScanRun,
  ScanRunRepository,
  ScanRunSource,
  ScanRunStatus,
  ScanRunTransition,
} from '@atlas/domain';
import { and, eq } from 'drizzle-orm';

import type { Database } from '../client';
import { scanRunEvents, scanRuns } from '../schema';

type ScanRunRow = typeof scanRuns.$inferSelect;

export class PostgresScanRunRepository implements ScanRunRepository {
  constructor(private readonly database: Database) {}

  async findById(id: string): Promise<ScanRun | null> {
    const rows = await this.database
      .select()
      .from(scanRuns)
      .where(eq(scanRuns.id, id))
      .limit(1);
    return rows[0] === undefined ? null : mapScanRun(rows[0]);
  }

  async findByIdempotency(
    requestedBy: string,
    idempotencyKeyHash: string,
  ): Promise<ScanRun | null> {
    const rows = await this.database
      .select()
      .from(scanRuns)
      .where(
        and(
          eq(scanRuns.requestedBy, requestedBy),
          eq(scanRuns.idempotencyKeyHash, idempotencyKeyHash),
        ),
      )
      .limit(1);
    return rows[0] === undefined ? null : mapScanRun(rows[0]);
  }

  async createIdempotently(
    input: NewScanRun,
  ): Promise<IdempotentScanRunCreation> {
    return this.database.transaction(async (transaction) => {
      const inserted = await transaction
        .insert(scanRuns)
        .values({
          sourceType: input.source.type,
          ...(input.source.id === undefined
            ? {}
            : { sourceId: input.source.id }),
          ...(input.source.revision === undefined
            ? {}
            : { sourceRevision: input.source.revision }),
          requestedBy: input.requestedBy,
          idempotencyKeyHash: input.idempotencyKeyHash,
          requestHash: input.requestHash,
          status: 'queued',
          executionMode: input.executionPlan.executionMode,
          planVersion: input.executionPlan.planVersion,
          ruleVersion: input.executionPlan.normalizedRule.version,
          normalizedRuleAst: input.executionPlan
            .normalizedRule as unknown as Record<string, unknown>,
          executionPlan: input.executionPlan as unknown as Record<
            string,
            unknown
          >,
          universeSnapshot: input.universeSnapshot as unknown as Record<
            string,
            unknown
          >,
          complexityScore: String(input.executionPlan.complexity.score),
          dataCutoffAt: input.dataCutoffAt,
          progressTotal: input.universeSnapshot.instrumentIds.length,
        })
        .onConflictDoNothing({
          target: [scanRuns.requestedBy, scanRuns.idempotencyKeyHash],
        })
        .returning();

      const row =
        inserted[0] ??
        (
          await transaction
            .select()
            .from(scanRuns)
            .where(
              and(
                eq(scanRuns.requestedBy, input.requestedBy),
                eq(scanRuns.idempotencyKeyHash, input.idempotencyKeyHash),
              ),
            )
            .limit(1)
        )[0];
      if (row === undefined) {
        throw new Error('Idempotent scan run insert invariant failed');
      }
      if (inserted[0] !== undefined) {
        await transaction.insert(scanRunEvents).values({
          scanRunId: row.id,
          eventType: 'run_created',
          toStatus: 'queued',
          actorUserId: input.requestedBy,
          occurredAt: row.queuedAt,
          payload: {
            planVersion: row.planVersion,
            ruleVersion: row.ruleVersion,
          },
        });
      }
      return { run: mapScanRun(row), created: inserted[0] !== undefined };
    });
  }

  async transition(input: ScanRunTransition): Promise<ScanRun | null> {
    return this.database.transaction(async (transaction) => {
      const updated = await transaction
        .update(scanRuns)
        .set({
          status: input.toStatus,
          updatedAt: input.occurredAt,
          ...(input.toStatus === 'running'
            ? { startedAt: input.occurredAt }
            : {}),
          ...(input.toStatus === 'completed' || input.toStatus === 'failed'
            ? { completedAt: input.occurredAt }
            : {}),
          ...(input.toStatus === 'cancel_requested'
            ? { cancelRequestedAt: input.occurredAt }
            : {}),
          ...(input.toStatus === 'cancelled'
            ? { cancelledAt: input.occurredAt }
            : {}),
          ...(input.errorCode === undefined
            ? {}
            : { errorCode: input.errorCode }),
        })
        .where(
          and(
            eq(scanRuns.id, input.runId),
            eq(scanRuns.status, input.fromStatus),
          ),
        )
        .returning();
      const row = updated[0];
      if (row === undefined) return null;

      await transaction.insert(scanRunEvents).values({
        scanRunId: row.id,
        eventType: 'status_transition',
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        actorUserId: input.actorUserId,
        occurredAt: input.occurredAt,
        payload:
          input.errorCode === undefined ? {} : { errorCode: input.errorCode },
      });
      return mapScanRun(row);
    });
  }
}

function mapScanRun(row: ScanRunRow): ScanRun {
  return {
    id: row.id,
    source: source(row),
    requestedBy: row.requestedBy,
    idempotencyKeyHash: row.idempotencyKeyHash,
    requestHash: row.requestHash,
    status: row.status as ScanRunStatus,
    executionMode: row.executionMode as ScanRun['executionMode'],
    planVersion: row.planVersion,
    ruleVersion: row.ruleVersion,
    normalizedRule:
      row.normalizedRuleAst as unknown as ScanRun['normalizedRule'],
    executionPlan: row.executionPlan as unknown as ScanExecutionPlan,
    universeSnapshot:
      row.universeSnapshot as unknown as ScanRun['universeSnapshot'],
    complexityScore: Number(row.complexityScore),
    dataCutoffAt: row.dataCutoffAt,
    queuedAt: row.queuedAt,
    cancelRequestedAt: row.cancelRequestedAt,
    cancelledAt: row.cancelledAt,
  };
}

function source(row: ScanRunRow): ScanRunSource {
  return {
    type: row.sourceType as ScanRunSource['type'],
    ...(row.sourceId === null ? {} : { id: row.sourceId }),
    ...(row.sourceRevision === null ? {} : { revision: row.sourceRevision }),
  };
}
