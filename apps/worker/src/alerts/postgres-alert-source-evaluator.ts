import { currentPriceBars, scanResults, type Database } from '@atlas/database';
import {
  createCoreIndicatorRegistry,
  type IndicatorInput,
  type IndicatorOutput,
  type IndicatorPriceBar,
  type IndicatorTimeframe,
} from '@atlas/domain';
import { and, asc, eq, lte } from 'drizzle-orm';
import { z } from 'zod';

import type {
  AlertCandidate,
  AlertEvaluationEvent,
  AlertSourceEvaluation,
  AlertSourceEvaluator,
} from './contracts';

const operatorSchema = z.enum(['GT', 'GTE', 'LT', 'LTE', 'EQ']);
const thresholdSchema = z.object({
  operator: operatorSchema,
  threshold: z.number().finite(),
});
const indicatorSchema = thresholdSchema.extend({
  indicatorCode: z.string().min(1),
  indicatorVersion: z.number().int().min(1),
  parameters: z.record(z.string(), z.unknown()),
  outputKey: z.string().min(1).optional(),
});

export class PostgresAlertSourceEvaluator implements AlertSourceEvaluator {
  private readonly indicators = createCoreIndicatorRegistry();

  constructor(private readonly database: Database) {}

  async evaluate(
    candidate: AlertCandidate,
    event: AlertEvaluationEvent,
  ): Promise<AlertSourceEvaluation> {
    if (event.type === 'scan_completed') {
      return this.evaluateScan(event.scanRunId);
    }
    if (!('instrumentId' in candidate.source)) {
      return notEvaluable('ALERT_SOURCE_EVENT_MISMATCH');
    }
    const bars = await this.loadBars(
      event.instrumentId,
      event.timeframe as IndicatorTimeframe,
      new Date(event.dataCutoffAt),
    );
    if (bars.length === 0) return notEvaluable('MARKET_DATA_MISSING');

    if (candidate.source.type === 'instrument_price') {
      const parsed = thresholdSchema.safeParse(candidate.sourceConfiguration);
      if (!parsed.success) return notEvaluable('ALERT_SOURCE_INVALID');
      const value = bars.at(-1)?.close;
      return scalarResult(
        value,
        parsed.data.operator,
        parsed.data.threshold,
        event.instrumentId,
      );
    }
    if (candidate.source.type === 'instrument_percent_change') {
      const parsed = thresholdSchema.safeParse(candidate.sourceConfiguration);
      if (!parsed.success) return notEvaluable('ALERT_SOURCE_INVALID');
      const current = bars.at(-1)?.close;
      const previous = bars.at(-2)?.close;
      const value =
        current === null ||
        current === undefined ||
        previous === null ||
        previous === undefined ||
        previous === 0
          ? null
          : ((current - previous) / previous) * 100;
      return scalarResult(
        value,
        parsed.data.operator,
        parsed.data.threshold,
        event.instrumentId,
      );
    }

    const parsed = indicatorSchema.safeParse(candidate.sourceConfiguration);
    if (!parsed.success) return notEvaluable('ALERT_SOURCE_INVALID');
    try {
      const definition = this.indicators.resolve(
        parsed.data.indicatorCode,
        parsed.data.indicatorVersion,
      );
      const parameters = definition.parseParameters(parsed.data.parameters);
      const output = definition.calculate(
        {
          instrumentId: event.instrumentId,
          timeframe: event.timeframe as IndicatorTimeframe,
          bars,
          adjustmentMode: 'raw',
          dataCutoffAt: new Date(event.dataCutoffAt),
        } satisfies IndicatorInput,
        parameters,
      );
      const value = latestOutput(output, parsed.data.outputKey);
      return scalarResult(
        value,
        parsed.data.operator,
        parsed.data.threshold,
        event.instrumentId,
      );
    } catch {
      return notEvaluable('INDICATOR_NOT_EVALUABLE');
    }
  }

  private async evaluateScan(
    scanRunId: string,
  ): Promise<AlertSourceEvaluation> {
    const rows = await this.database
      .select({
        instrumentId: scanResults.instrumentId,
        status: scanResults.status,
      })
      .from(scanResults)
      .where(eq(scanResults.scanRunId, scanRunId));
    const matchedInstrumentIds = rows
      .filter(({ status }) => status === 'matched')
      .map(({ instrumentId }) => instrumentId)
      .sort();
    if (matchedInstrumentIds.length > 0) {
      return {
        status: 'matched',
        reasonCode: null,
        matchedInstrumentIds,
        result: { matchedCount: matchedInstrumentIds.length },
      };
    }
    if (rows.some(({ status }) => status === 'not_evaluable')) {
      return notEvaluable('SCAN_RESULT_NOT_EVALUABLE');
    }
    return {
      status: 'not_matched',
      reasonCode: null,
      matchedInstrumentIds: [],
      result: { matchedCount: 0 },
    };
  }

  private async loadBars(
    instrumentId: string,
    timeframe: IndicatorTimeframe,
    dataCutoffAt: Date,
  ): Promise<readonly IndicatorPriceBar[]> {
    const rows = await this.database
      .select()
      .from(currentPriceBars)
      .where(
        and(
          eq(currentPriceBars.instrumentId, instrumentId),
          eq(currentPriceBars.timeframe, timeframe),
          lte(currentPriceBars.closeTime, dataCutoffAt),
        ),
      )
      .orderBy(asc(currentPriceBars.openTime));
    return rows.map((row) => ({
      timestamp: row.openTime,
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: Number(row.volume),
      isClosed: row.isClosed,
    }));
  }
}

function scalarResult(
  value: number | null | undefined,
  operator: z.infer<typeof operatorSchema>,
  threshold: number,
  instrumentId: string,
): AlertSourceEvaluation {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return notEvaluable('VALUE_NOT_EVALUABLE');
  }
  const matched = compare(value, operator, threshold);
  return {
    status: matched ? 'matched' : 'not_matched',
    reasonCode: null,
    matchedInstrumentIds: matched ? [instrumentId] : [],
    result: { value, operator, threshold },
  };
}

function compare(
  value: number,
  operator: z.infer<typeof operatorSchema>,
  threshold: number,
): boolean {
  if (operator === 'GT') return value > threshold;
  if (operator === 'GTE') return value >= threshold;
  if (operator === 'LT') return value < threshold;
  if (operator === 'LTE') return value <= threshold;
  return value === threshold;
}

function latestOutput(
  output: IndicatorOutput,
  outputKey: string | undefined,
): number | null {
  if (output.kind === 'scalar') return output.values.at(-1) ?? null;
  if (outputKey === undefined) return null;
  return output.outputs[outputKey]?.at(-1) ?? null;
}

function notEvaluable(reasonCode: string): AlertSourceEvaluation {
  return {
    status: 'not_evaluable',
    reasonCode,
    matchedInstrumentIds: [],
    result: {},
  };
}
