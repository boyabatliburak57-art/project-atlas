import { Inject, Injectable } from '@nestjs/common';
import {
  instruments,
  patternDefinitions,
  patternInstances,
} from '@atlas/database';
import { and, desc, eq, type SQL } from 'drizzle-orm';
import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';
import type { PatternReadModel } from './patterns.ports';

@Injectable()
export class PostgresPatternReadModel implements PatternReadModel {
  constructor(@Inject(ApiDatabase) private readonly connection: ApiDatabase) {}
  async catalog() {
    return (
      await this.connection.database
        .select()
        .from(patternDefinitions)
        .orderBy(patternDefinitions.code, patternDefinitions.version)
    ).map((row) => ({
      code: row.code,
      version: row.version,
      algorithmVersion: row.algorithmVersion,
      category: row.category,
      parameterSchema: row.parameterSchema,
      evidenceSchemaVersion: row.evidenceSchemaVersion,
      status: row.status,
      disclaimer:
        'Algorithmic candidate; not a prediction or investment advice.',
    }));
  }
  async symbolId(normalizedSymbol: string) {
    return (
      (
        await this.connection.database
          .select({ id: instruments.id, symbol: instruments.symbol })
          .from(instruments)
          .where(eq(instruments.normalizedSymbol, normalizedSymbol))
          .limit(1)
      )[0] ?? null
    );
  }
  async list(input: Parameters<PatternReadModel['list']>[0]) {
    const filters: SQL[] = [
      eq(patternInstances.timeframe, input.timeframe),
      eq(patternInstances.adjustmentMode, databaseMode(input.adjustmentMode)),
    ];
    if (input.instrumentId)
      filters.push(eq(patternInstances.instrumentId, input.instrumentId));
    if (input.state) filters.push(eq(patternInstances.state, input.state));
    const rows = await this.connection.database
      .select({ instance: patternInstances, symbol: instruments.symbol })
      .from(patternInstances)
      .innerJoin(instruments, eq(instruments.id, patternInstances.instrumentId))
      .where(and(...filters))
      .orderBy(desc(patternInstances.detectedAt), desc(patternInstances.id))
      .limit(input.limit);
    return rows.map(({ instance: row, symbol }) => ({
      id: row.id,
      instrumentId: row.instrumentId,
      symbol,
      timeframe: row.timeframe,
      adjustmentMode: publicMode(row.adjustmentMode),
      code: row.patternCode,
      version: row.patternVersion,
      algorithmVersion: row.algorithmVersion,
      state: row.state,
      direction: row.direction,
      startTime: row.startTime,
      endTime: row.endTime,
      detectedAt: row.detectedAt,
      confirmedAt: row.confirmedAt,
      invalidatedAt: row.invalidatedAt,
      dataCutoffAt: row.dataCutoffAt,
      confidence: row.confidence,
      evidence: row.evidence,
      warnings: row.warnings,
    }));
  }
}
function databaseMode(mode: string) {
  return mode === 'split-adjusted'
    ? 'split_adjusted'
    : mode === 'total-return'
      ? 'total_return_adjusted'
      : 'raw';
}
function publicMode(mode: string) {
  return mode === 'split_adjusted'
    ? 'split-adjusted'
    : mode === 'total_return_adjusted'
      ? 'total-return'
      : 'raw';
}
