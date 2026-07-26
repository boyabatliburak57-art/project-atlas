import {
  dataCorrectionRequests,
  dataQualityFindings,
  operationalAuditEvents,
  providerConnections,
  providerDataRevisions,
  providerIngestionRuns,
} from '@atlas/database';
import { transitionCorrection, type CorrectionState } from '@atlas/domain';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import { TelemetryService } from '../observability/telemetry.service';
import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';
import type { OperationalActorContext } from '../operations/operational-controls.service';

const createSchema = z.object({
  findingId: z.string().uuid(),
  reason: z.string().trim().min(8).max(4_096),
  expectedFindingVersion: z.number().int().positive(),
});
const transitionSchema = z.object({
  confirmation: z.string().max(120).optional(),
  expectedVersion: z.number().int().positive(),
  reason: z.string().trim().min(8).max(4_096),
  replayIdempotencyKey: z.string().trim().min(8).max(160).optional(),
  targetRevisionId: z.string().uuid().optional(),
});

@Injectable()
export class DataOperationsService {
  private readonly environment: string;

  constructor(
    private readonly connection: ApiDatabase,
    config: ConfigService,
    private readonly telemetry: TelemetryService,
  ) {
    this.environment = config.getOrThrow<string>('ATLAS_ENV');
  }

  async overview() {
    const [connections, runs, findings, corrections] = await Promise.all([
      this.connection.database
        .select({
          capabilities: providerConnections.capabilities,
          health: providerConnections.health,
          id: providerConnections.id,
          providerKey: providerConnections.providerKey,
          status: providerConnections.status,
          updatedAt: providerConnections.updatedAt,
          version: providerConnections.version,
        })
        .from(providerConnections)
        .orderBy(providerConnections.providerKey),
      this.connection.database
        .select()
        .from(providerIngestionRuns)
        .orderBy(desc(providerIngestionRuns.startedAt))
        .limit(50),
      this.connection.database
        .select()
        .from(dataQualityFindings)
        .orderBy(desc(dataQualityFindings.lastDetectedAt))
        .limit(100),
      this.connection.database
        .select()
        .from(dataCorrectionRequests)
        .orderBy(desc(dataCorrectionRequests.updatedAt))
        .limit(100),
    ]);
    return { connections, corrections, findings, runs };
  }

  async createCorrection(actor: OperationalActorContext, body: unknown) {
    const input = parse(createSchema, body);
    return this.connection.database.transaction(async (transaction) => {
      const [finding] = await transaction
        .select()
        .from(dataQualityFindings)
        .where(eq(dataQualityFindings.id, input.findingId))
        .limit(1);
      if (finding === undefined)
        throw new NotFoundException({
          code: 'DATA_QUALITY_FINDING_NOT_FOUND',
          message: 'Data-quality finding was not found',
        });
      if (finding.version !== input.expectedFindingVersion)
        throw versionConflict(finding.version);
      const before = {
        findingId: finding.id,
        findingStatus: finding.status,
        findingVersion: finding.version,
      };
      const [created] = await transaction
        .insert(dataCorrectionRequests)
        .values({
          afterState: { state: 'open' },
          beforeState: before,
          correlationId:
            actor.correlationId ??
            actor.requestId ??
            `correction:${finding.id}`,
          findingId: finding.id,
          reason: input.reason,
          requestedByUserId: actor.userId,
        })
        .returning();
      if (created === undefined) throw new Error('CORRECTION_CREATE_FAILED');
      await transaction.insert(operationalAuditEvents).values({
        action: 'data_correction.created',
        actorType: 'operations_admin',
        actorUserId: actor.userId,
        afterState: { state: created.state, version: created.version },
        beforeState: before,
        correlationId: actor.correlationId,
        environment: this.environment,
        reason: input.reason,
        requestId: actor.requestId,
        resourceId: created.id,
        resourceType: 'data_correction_request',
      });
      this.recordMetric('data_quality.corrections.created', 1);
      return created;
    });
  }

  async transition(
    actor: OperationalActorContext,
    id: string,
    next: CorrectionState,
    body: unknown,
  ) {
    const input = parse(transitionSchema, body);
    return this.connection.database.transaction(async (transaction) => {
      const [current] = await transaction
        .select()
        .from(dataCorrectionRequests)
        .where(eq(dataCorrectionRequests.id, id))
        .limit(1);
      if (current === undefined)
        throw new NotFoundException({
          code: 'DATA_CORRECTION_NOT_FOUND',
          message: 'Data correction request was not found',
        });
      let changed;
      try {
        changed = transitionCorrection(
          {
            findingId: current.findingId,
            id: current.id,
            rebuildStatus: current.rebuildStatus as
              | 'not_requested'
              | 'stale'
              | 'rebuilding'
              | 'fresh'
              | 'failed',
            ...(current.replayIdempotencyKey === null
              ? {}
              : { replayIdempotencyKey: current.replayIdempotencyKey }),
            state: current.state as CorrectionState,
            ...(current.targetRevisionId === null
              ? {}
              : { targetRevisionId: current.targetRevisionId }),
            version: current.version,
          },
          {
            expectedVersion: input.expectedVersion,
            next,
            reason: input.reason,
            ...(input.confirmation === undefined
              ? {}
              : { confirmation: input.confirmation }),
            ...(input.replayIdempotencyKey === undefined
              ? {}
              : { replayIdempotencyKey: input.replayIdempotencyKey }),
            ...(input.targetRevisionId === undefined
              ? {}
              : { targetRevisionId: input.targetRevisionId }),
          },
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === 'CORRECTION_VERSION_CONFLICT'
        )
          throw versionConflict(current.version);
        throw new BadRequestException({
          code: error instanceof Error ? error.message : 'CORRECTION_INVALID',
          message: 'Correction transition is invalid',
        });
      }
      if (changed.targetRevisionId !== undefined) {
        const [revision] = await transaction
          .select({ id: providerDataRevisions.id })
          .from(providerDataRevisions)
          .where(eq(providerDataRevisions.id, changed.targetRevisionId))
          .limit(1);
        if (revision === undefined)
          throw new BadRequestException({
            code: 'TARGET_REVISION_NOT_FOUND',
            message: 'Replay target must be an immutable provider revision',
          });
      }
      const before = {
        rebuildStatus: current.rebuildStatus,
        state: current.state,
        version: current.version,
      };
      const after = {
        rebuildStatus: changed.rebuildStatus,
        state: changed.state,
        version: changed.version,
      };
      const [updated] = await transaction
        .update(dataCorrectionRequests)
        .set({
          afterState: after,
          rebuildStatus: changed.rebuildStatus,
          ...(next === 'resolved' ? { resolvedAt: new Date() } : {}),
          ...(next === 'approved' || next === 'rejected'
            ? { reviewedByUserId: actor.userId }
            : {}),
          ...(changed.replayIdempotencyKey === undefined
            ? {}
            : { replayIdempotencyKey: changed.replayIdempotencyKey }),
          state: changed.state,
          ...(changed.targetRevisionId === undefined
            ? {}
            : { targetRevisionId: changed.targetRevisionId }),
          updatedAt: new Date(),
          version: changed.version,
        })
        .where(
          and(
            eq(dataCorrectionRequests.id, id),
            eq(dataCorrectionRequests.version, input.expectedVersion),
          ),
        )
        .returning();
      if (updated === undefined) throw versionConflict(current.version);
      await transaction.insert(operationalAuditEvents).values({
        action: `data_correction.${next}`,
        actorType: 'operations_admin',
        actorUserId: actor.userId,
        afterState: after,
        beforeState: before,
        correlationId: actor.correlationId,
        environment: this.environment,
        reason: input.reason,
        requestId: actor.requestId,
        resourceId: current.id,
        resourceType: 'data_correction_request',
      });
      this.recordMetric(`data_quality.corrections.${next}`, 1);
      return updated;
    });
  }

  async markFinding(input: {
    fingerprint: string;
    findingType: string;
    severity: 'info' | 'warning' | 'critical';
    resourceType: string;
    resourceKey: string;
    evidence: Readonly<Record<string, unknown>>;
    detectedAt: Date;
  }) {
    const [result] = await this.connection.database
      .insert(dataQualityFindings)
      .values({
        ...input,
        firstDetectedAt: input.detectedAt,
        lastDetectedAt: input.detectedAt,
      })
      .onConflictDoUpdate({
        set: {
          evidence: input.evidence,
          lastDetectedAt: input.detectedAt,
          occurrences: sql`${dataQualityFindings.occurrences} + 1`,
          updatedAt: input.detectedAt,
          version: sql`${dataQualityFindings.version} + 1`,
        },
        target: dataQualityFindings.fingerprint,
      })
      .returning();
    this.recordMetric(`data_quality.findings.${input.findingType}`, 1);
    if (input.severity === 'critical')
      this.telemetry.log('error', 'data_quality.finding.critical', {
        findingType: input.findingType,
        outcome: 'open',
        resourceType: input.resourceType,
      });
    return result;
  }

  private recordMetric(name: string, value: number) {
    this.telemetry.metric({
      kind: 'counter',
      labels: { environment: this.environment, service: 'atlas-api' },
      name,
      value,
    });
  }
}

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success)
    throw new BadRequestException({
      code: 'DATA_OPERATION_REQUEST_INVALID',
      details: result.error.issues.map((issue) => ({
        code: issue.code,
        path: issue.path.join('.'),
      })),
      message: 'Data operation request is invalid',
    });
  return result.data;
}

function versionConflict(currentVersion: number) {
  return new ConflictException({
    code: 'DATA_CORRECTION_VERSION_CONFLICT',
    details: { currentVersion },
    message: 'Data correction changed',
  });
}
