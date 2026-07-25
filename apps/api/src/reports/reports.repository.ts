import { generatedReports } from '@atlas/database';
import { Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, lt, or, sql } from 'drizzle-orm';

import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';

@Injectable()
export class ReportsRepository {
  constructor(private readonly connection: ApiDatabase) {}

  async ownsSource(userId: string, sourceType: string, sourceId: string) {
    const definitions: Record<string, { table: string; owner: string }> = {
      alert_history: { table: 'alerts', owner: 'owner_user_id' },
      backtest: { table: 'backtest_runs', owner: 'requested_by' },
      experiment_matrix: {
        table: 'research_experiments',
        owner: 'owner_user_id',
      },
      portfolio: { table: 'portfolios', owner: 'user_id' },
      scanner: { table: 'saved_scans', owner: 'owner_user_id' },
    };
    const definition = definitions[sourceType];
    if (definition === undefined) return false;
    const result = await this.connection.pool.query(
      `select 1 from ${definition.table}
       where id = $1 and ${definition.owner} = $2 limit 1`,
      [sourceId, userId],
    );
    return result.rowCount === 1;
  }

  async create(values: typeof generatedReports.$inferInsert) {
    const rows = await this.connection.database
      .insert(generatedReports)
      .values(values)
      .onConflictDoNothing({
        target: [generatedReports.ownerUserId, generatedReports.requestHash],
      })
      .returning();
    if (rows[0] !== undefined) return rows[0];
    return (
      await this.connection.database
        .select()
        .from(generatedReports)
        .where(
          and(
            eq(generatedReports.ownerUserId, values.ownerUserId),
            eq(generatedReports.requestHash, values.requestHash),
          ),
        )
        .limit(1)
    )[0]!;
  }

  async find(ownerUserId: string, id: string) {
    return (
      (
        await this.connection.database
          .select()
          .from(generatedReports)
          .where(
            and(
              eq(generatedReports.id, id),
              eq(generatedReports.ownerUserId, ownerUserId),
              isNull(generatedReports.deletedAt),
            ),
          )
          .limit(1)
      )[0] ?? null
    );
  }

  async list(
    ownerUserId: string,
    cursor: { createdAt: Date; id: string } | null,
    limit: number,
  ) {
    const cursorFilter =
      cursor === null
        ? undefined
        : or(
            lt(generatedReports.createdAt, cursor.createdAt),
            and(
              eq(generatedReports.createdAt, cursor.createdAt),
              lt(generatedReports.id, cursor.id),
            ),
          );
    return this.connection.database
      .select({
        id: generatedReports.id,
        reportType: generatedReports.reportType,
        sourceType: generatedReports.sourceType,
        sourceId: generatedReports.sourceId,
        status: generatedReports.status,
        contentType: generatedReports.contentType,
        byteSize: generatedReports.byteSize,
        methodology: generatedReports.methodology,
        sourceRevisions: generatedReports.sourceRevisions,
        warnings: generatedReports.warnings,
        dataCutoffAt: generatedReports.dataCutoffAt,
        generatedAt: generatedReports.generatedAt,
        expiresAt: generatedReports.expiresAt,
        createdAt: generatedReports.createdAt,
      })
      .from(generatedReports)
      .where(
        and(
          eq(generatedReports.ownerUserId, ownerUserId),
          isNull(generatedReports.deletedAt),
          cursorFilter,
        ),
      )
      .orderBy(desc(generatedReports.createdAt), desc(generatedReports.id))
      .limit(limit);
  }

  async cancel(ownerUserId: string, id: string) {
    return (
      (
        await this.connection.database
          .update(generatedReports)
          .set({ status: 'cancelled', updatedAt: new Date() })
          .where(
            and(
              eq(generatedReports.id, id),
              eq(generatedReports.ownerUserId, ownerUserId),
              isNull(generatedReports.deletedAt),
              sql`${generatedReports.status} in ('queued', 'running')`,
            ),
          )
          .returning()
      )[0] ?? null
    );
  }

  async softDelete(ownerUserId: string, id: string) {
    const now = new Date();
    return (
      (
        await this.connection.database
          .update(generatedReports)
          .set({
            artifactPayload: null,
            byteSize: null,
            contentType: null,
            deletedAt: now,
            status: 'deleted',
            storageKey: null,
            updatedAt: now,
          })
          .where(
            and(
              eq(generatedReports.id, id),
              eq(generatedReports.ownerUserId, ownerUserId),
              isNull(generatedReports.deletedAt),
            ),
          )
          .returning({ id: generatedReports.id })
      )[0] ?? null
    );
  }

  async expire(now: Date): Promise<number> {
    const result = await this.connection.database.execute(sql`
      update ${generatedReports}
      set status = 'expired', artifact_payload = null, storage_key = null,
          content_type = null, byte_size = null, updated_at = ${now}
      where ${generatedReports.expiresAt} <= ${now}
        and ${generatedReports.status} not in ('expired', 'deleted')
      returning ${generatedReports.id}
    `);
    return result.rows.length;
  }
}
