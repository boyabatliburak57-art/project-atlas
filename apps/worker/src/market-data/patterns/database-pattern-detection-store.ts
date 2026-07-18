import {
  currentPriceBars,
  patternDefinitions,
  patternInstances,
  type Database,
} from '@atlas/database';
import {
  coreDefinitions,
  type AdjustmentMode,
  type PatternBar,
  type PatternDetection,
  type PatternState,
} from '@atlas/domain';
import { and, asc, desc, eq, inArray, lte } from 'drizzle-orm';
import type { PatternDetectionStore } from './pattern-detection-service';

export class DatabasePatternDetectionStore implements PatternDetectionStore {
  constructor(private readonly database: Database) {}

  async loadClosedBars(
    input: Parameters<PatternDetectionStore['loadClosedBars']>[0],
  ) {
    const rows = await this.database
      .select({
        instrumentId: currentPriceBars.instrumentId,
        timestamp: currentPriceBars.openTime,
        open: currentPriceBars.open,
        high: currentPriceBars.high,
        low: currentPriceBars.low,
        close: currentPriceBars.close,
        volume: currentPriceBars.volume,
        isClosed: currentPriceBars.isClosed,
        providerId: currentPriceBars.providerId,
      })
      .from(currentPriceBars)
      .where(
        and(
          inArray(currentPriceBars.instrumentId, [...input.instrumentIds]),
          eq(currentPriceBars.timeframe, input.timeframe),
          eq(currentPriceBars.isClosed, true),
          lte(currentPriceBars.openTime, input.dataCutoffAt),
        ),
      )
      .orderBy(
        asc(currentPriceBars.instrumentId),
        desc(currentPriceBars.openTime),
        asc(currentPriceBars.providerId),
      );
    const grouped = new Map<string, PatternBar[]>();
    const seen = new Set<string>();
    for (const row of rows) {
      const identity = `${row.instrumentId}:${row.timestamp.toISOString()}`;
      if (seen.has(identity)) continue;
      seen.add(identity);
      const bars = grouped.get(row.instrumentId) ?? [];
      if (bars.length < input.limit)
        bars.push({
          timestamp: row.timestamp,
          open: Number(row.open),
          high: Number(row.high),
          low: Number(row.low),
          close: Number(row.close),
          volume: row.volume === null ? null : Number(row.volume),
          isClosed: row.isClosed,
        });
      grouped.set(row.instrumentId, bars);
    }
    for (const bars of grouped.values()) bars.reverse();
    return grouped;
  }

  async transitionCandidates(
    input: Parameters<PatternDetectionStore['transitionCandidates']>[0],
  ) {
    const mode = databaseMode(input.adjustmentMode);
    const candidates = await this.database
      .select()
      .from(patternInstances)
      .where(
        and(
          inArray(patternInstances.instrumentId, [...input.instrumentIds]),
          eq(patternInstances.timeframe, input.timeframe),
          eq(patternInstances.adjustmentMode, mode),
          eq(patternInstances.state, 'candidate'),
        ),
      );
    let confirmed = 0,
      invalidated = 0;
    for (const candidate of candidates) {
      const latest = input.latestCloses.get(candidate.instrumentId);
      if (!latest || latest.time <= candidate.endTime) continue;
      const evidence = candidate.evidence as {
        breakoutLevel?: unknown;
        invalidationLevel?: unknown;
      };
      const breakout = numeric(evidence.breakoutLevel);
      const invalidation = numeric(evidence.invalidationLevel);
      if (breakout === null || invalidation === null) continue;
      const bullish = candidate.direction === 'bullish';
      const state: PatternState | null = bullish
        ? latest.close > breakout
          ? 'confirmed'
          : latest.close < invalidation
            ? 'invalidated'
            : null
        : latest.close < breakout
          ? 'confirmed'
          : latest.close > invalidation
            ? 'invalidated'
            : null;
      if (!state) continue;
      await this.database
        .update(patternInstances)
        .set({
          state,
          confirmedAt: state === 'confirmed' ? latest.time : null,
          invalidatedAt: state === 'invalidated' ? latest.time : null,
          dataCutoffAt: input.dataCutoffAt,
          updatedAt: new Date(),
        })
        .where(eq(patternInstances.id, candidate.id));
      if (state === 'confirmed') confirmed += 1;
      else invalidated += 1;
    }
    return { confirmed, invalidated };
  }

  async persist(detections: readonly PatternDetection[]) {
    for (const definition of coreDefinitions)
      await this.database
        .insert(patternDefinitions)
        .values({
          code: definition.code,
          version: definition.version,
          algorithmVersion: definition.algorithmVersion,
          category: definition.category,
          parameterSchema: definition.parameterSchema.metadata,
          evidenceSchemaVersion: 1,
          status: 'active',
        })
        .onConflictDoNothing();
    let inserted = 0;
    for (let offset = 0; offset < detections.length; offset += 200) {
      const chunk = detections.slice(offset, offset + 200);
      const rows = await this.database
        .insert(patternInstances)
        .values(
          chunk.map((item) => ({
            instrumentId: item.instrumentId,
            timeframe: item.timeframe,
            adjustmentMode: databaseMode(item.adjustmentMode),
            patternCode: item.patternCode,
            patternVersion: item.patternVersion,
            algorithmVersion: item.algorithmVersion,
            state: item.state,
            direction: item.direction,
            startTime: item.startTime,
            endTime: item.endTime,
            detectedAt: item.detectedAt,
            confirmedAt: item.state === 'confirmed' ? item.detectedAt : null,
            dataCutoffAt: item.dataCutoffAt,
            confidence:
              item.confidence === null ? null : String(item.confidence),
            evidenceVersion: 1,
            evidence: {
              schemaVersion: 1,
              points: item.evidencePoints.map((point) => ({
                time: point.time.toISOString(),
                price: String(point.price),
                role: point.role,
              })),
              breakoutLevel: item.breakoutLevel,
              invalidationLevel: item.invalidationLevel,
              volumeConfirmation: item.volumeConfirmation,
            },
            deduplicationKey: item.deduplicationKey,
            warnings: item.warnings.map((code) => ({ code })),
          })),
        )
        .onConflictDoNothing()
        .returning({ id: patternInstances.id });
      inserted += rows.length;
    }
    return { inserted, duplicates: detections.length - inserted };
  }
}

function databaseMode(mode: AdjustmentMode) {
  return mode === 'split-adjusted'
    ? 'split_adjusted'
    : mode === 'total-return'
      ? 'total_return_adjusted'
      : 'raw';
}
function numeric(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : typeof value === 'string' && Number.isFinite(Number(value))
      ? Number(value)
      : null;
}
