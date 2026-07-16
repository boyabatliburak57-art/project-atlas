import {
  alertEvaluations,
  alertRevisions,
  alerts,
  alertTriggers,
  currentPriceBars,
  instruments,
  presetScanRevisions,
  presetScans,
  savedScanRevisions,
  savedScans,
  scanResults,
  scanRuns,
  watchlistItems,
  watchlists,
} from '@atlas/database';
import {
  createCoreIndicatorRegistry,
  createAlertRevision,
  type AlertRevision,
  type AlertSource,
  type AlertStatus,
  type IndicatorInput,
  type IndicatorOutput,
  type IndicatorPriceBar,
  type IndicatorTimeframe,
} from '@atlas/domain';
import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray, lt, lte, or } from 'drizzle-orm';
import { z } from 'zod';

import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';
import type {
  AlertDryRunEvaluator,
  AlertStore,
  AlertView,
} from './alerts.ports';

type AlertRow = typeof alerts.$inferSelect;
type RevisionRow = typeof alertRevisions.$inferSelect;

@Injectable()
export class PostgresAlertStore implements AlertStore {
  constructor(private readonly connection: ApiDatabase) {}

  async listOwned(input: Parameters<AlertStore['listOwned']>[0]) {
    const cursorCondition =
      input.cursor === undefined
        ? undefined
        : or(
            lt(alerts.updatedAt, input.cursor.updatedAt),
            and(
              eq(alerts.updatedAt, input.cursor.updatedAt),
              lt(alerts.id, input.cursor.id),
            ),
          );
    const rows = await this.connection.database
      .select({ alert: alerts, revision: alertRevisions })
      .from(alerts)
      .innerJoin(
        alertRevisions,
        and(
          eq(alertRevisions.alertId, alerts.id),
          eq(alertRevisions.revision, alerts.currentRevision),
        ),
      )
      .where(
        and(
          eq(alerts.ownerUserId, input.userId),
          input.status === undefined
            ? undefined
            : eq(alerts.status, input.status),
          cursorCondition,
        ),
      )
      .orderBy(desc(alerts.updatedAt), desc(alerts.id))
      .limit(input.limit);
    return {
      items: rows.map(({ alert, revision }) => view(alert, revision)),
      hasNext: false,
    };
  }

  async find(id: string): Promise<AlertView | null> {
    const row = (
      await this.connection.database
        .select({ alert: alerts, revision: alertRevisions })
        .from(alerts)
        .innerJoin(
          alertRevisions,
          and(
            eq(alertRevisions.alertId, alerts.id),
            eq(alertRevisions.revision, alerts.currentRevision),
          ),
        )
        .where(eq(alerts.id, id))
        .limit(1)
    )[0];
    return row === undefined ? null : view(row.alert, row.revision);
  }

  async create(input: Parameters<AlertStore['create']>[0]) {
    await this.connection.database.transaction(async (transaction) => {
      await transaction.insert(alerts).values({
        id: input.id,
        ownerUserId: input.userId,
        name: input.name,
        status: 'active',
        currentRevision: 1,
        createdAt: input.now,
        updatedAt: input.now,
      });
      await transaction
        .insert(alertRevisions)
        .values(revisionValues(input.revision));
    });
    const created = await this.find(input.id);
    if (created === null) throw new Error('Alert insert invariant failed');
    return created;
  }

  async revise(input: Parameters<AlertStore['revise']>[0]) {
    const changed = await this.connection.database.transaction(
      async (transaction) => {
        const parent = (
          await transaction
            .update(alerts)
            .set({
              name: input.name,
              currentRevision: input.revision.revision,
              updatedAt: input.now,
            })
            .where(
              and(
                eq(alerts.id, input.id),
                eq(alerts.ownerUserId, input.userId),
                eq(alerts.currentRevision, input.expectedRevision),
                inArray(alerts.status, ['active', 'paused', 'invalid']),
              ),
            )
            .returning({ id: alerts.id })
        )[0];
        if (parent === undefined) return false;
        await transaction
          .insert(alertRevisions)
          .values(revisionValues(input.revision));
        return true;
      },
    );
    return changed ? this.find(input.id) : null;
  }

  async rename(input: Parameters<AlertStore['rename']>[0]) {
    const row = (
      await this.connection.database
        .update(alerts)
        .set({ name: input.name, updatedAt: input.now })
        .where(
          and(
            eq(alerts.id, input.id),
            eq(alerts.ownerUserId, input.userId),
            eq(alerts.currentRevision, input.expectedRevision),
            inArray(alerts.status, ['active', 'paused', 'invalid']),
          ),
        )
        .returning({ id: alerts.id })
    )[0];
    return row === undefined ? null : this.find(row.id);
  }

  async setStatus(input: Parameters<AlertStore['setStatus']>[0]) {
    const row = (
      await this.connection.database
        .update(alerts)
        .set({
          status: input.to,
          deletedAt: input.to === 'deleted' ? input.now : null,
          updatedAt: input.now,
        })
        .where(
          and(
            eq(alerts.id, input.id),
            eq(alerts.ownerUserId, input.userId),
            inArray(alerts.status, [...input.from]),
          ),
        )
        .returning({ id: alerts.id })
    )[0];
    return row === undefined ? null : this.find(row.id);
  }

  async revisions(alertId: string) {
    const rows = await this.connection.database
      .select()
      .from(alertRevisions)
      .where(eq(alertRevisions.alertId, alertId))
      .orderBy(desc(alertRevisions.revision));
    return rows.map(revision);
  }

  async evaluations(alertId: string, limit: number, before?: number) {
    return this.connection.database
      .select()
      .from(alertEvaluations)
      .where(
        and(
          eq(alertEvaluations.alertId, alertId),
          before === undefined ? undefined : lt(alertEvaluations.id, before),
        ),
      )
      .orderBy(desc(alertEvaluations.id))
      .limit(limit);
  }

  async triggers(alertId: string, limit: number, before?: Date) {
    const rows = await this.connection.database
      .select()
      .from(alertTriggers)
      .where(
        and(
          eq(alertTriggers.alertId, alertId),
          before === undefined
            ? undefined
            : lt(alertTriggers.occurredAt, before),
        ),
      )
      .orderBy(desc(alertTriggers.occurredAt), desc(alertTriggers.id))
      .limit(limit);
    return rows.map((row) => ({
      id: row.id,
      alertId: row.alertId,
      alertRevision: row.alertRevision,
      evaluationId: row.evaluationId,
      instrumentId: row.instrumentId,
      triggerType: row.triggerType,
      payload: row.payload,
      occurredAt: row.occurredAt,
    }));
  }

  async sourceAccess(userId: string, source: AlertSource) {
    if (source.type === 'saved_scan') {
      return this.savedScanAccess(
        userId,
        source.savedScanId,
        source.savedScanRevision,
      );
    }
    if (source.type === 'watchlist_saved_scan') {
      const scan = await this.savedScanAccess(
        userId,
        source.savedScanId,
        source.savedScanRevision,
      );
      if (scan !== 'allowed') return scan;
      const watchlist = (
        await this.connection.database
          .select({ owner: watchlists.ownerUserId, status: watchlists.status })
          .from(watchlists)
          .where(eq(watchlists.id, source.watchlistId))
          .limit(1)
      )[0];
      if (watchlist === undefined || watchlist.status !== 'active')
        return 'invalid';
      return watchlist.owner === userId ? 'allowed' : 'denied';
    }
    if (source.type === 'preset_scan') {
      const row = (
        await this.connection.database
          .select({
            status: presetScans.status,
            lifecycle: presetScanRevisions.lifecycleStatus,
          })
          .from(presetScans)
          .innerJoin(
            presetScanRevisions,
            and(
              eq(presetScanRevisions.presetScanId, presetScans.id),
              eq(presetScanRevisions.revision, source.presetScanRevision),
            ),
          )
          .where(eq(presetScans.id, source.presetScanId))
          .limit(1)
      )[0];
      return row?.status === 'published' && row.lifecycle === 'published'
        ? 'allowed'
        : 'invalid';
    }
    const row = (
      await this.connection.database
        .select({ id: instruments.id })
        .from(instruments)
        .where(
          and(
            eq(instruments.id, source.instrumentId),
            eq(instruments.status, 'active'),
          ),
        )
        .limit(1)
    )[0];
    return row === undefined ? 'invalid' : 'allowed';
  }

  private async savedScanAccess(
    userId: string,
    savedScanId: string,
    savedScanRevision: number,
  ) {
    const row = (
      await this.connection.database
        .select({
          owner: savedScans.ownerUserId,
          status: savedScans.status,
          revision: savedScanRevisions.revision,
        })
        .from(savedScans)
        .leftJoin(
          savedScanRevisions,
          and(
            eq(savedScanRevisions.savedScanId, savedScans.id),
            eq(savedScanRevisions.revision, savedScanRevision),
          ),
        )
        .where(eq(savedScans.id, savedScanId))
        .limit(1)
    )[0];
    if (row === undefined) return 'invalid' as const;
    if (row.owner !== userId) return 'denied' as const;
    return row.status === 'active' && row.revision !== null
      ? ('allowed' as const)
      : ('invalid' as const);
  }
}

const dryRunOperatorSchema = z.enum(['GT', 'GTE', 'LT', 'LTE', 'EQ']);
const dryRunThresholdSchema = z.object({
  operator: dryRunOperatorSchema,
  threshold: z.number().finite(),
});
const dryRunIndicatorSchema = dryRunThresholdSchema.extend({
  indicatorCode: z.string().min(1),
  indicatorVersion: z.number().int().min(1),
  parameters: z.record(z.string(), z.unknown()),
  outputKey: z.string().min(1).optional(),
});

@Injectable()
export class PostgresAlertDryRunEvaluator implements AlertDryRunEvaluator {
  private readonly indicators = createCoreIndicatorRegistry();

  constructor(private readonly connection: ApiDatabase) {}

  async evaluate(input: Parameters<AlertDryRunEvaluator['evaluate']>[0]) {
    const source = input.alert.revision.source;
    if (
      source.type === 'saved_scan' ||
      source.type === 'preset_scan' ||
      source.type === 'watchlist_saved_scan'
    ) {
      return this.evaluateScan(input);
    }
    return this.evaluateInstrument(input);
  }

  private async evaluateScan(
    input: Parameters<AlertDryRunEvaluator['evaluate']>[0],
  ) {
    const source = input.alert.revision.source;
    if (
      source.type !== 'saved_scan' &&
      source.type !== 'preset_scan' &&
      source.type !== 'watchlist_saved_scan'
    ) {
      return notEvaluableDryRun('ALERT_SOURCE_INVALID', input.dataCutoffAt);
    }
    const sourceType =
      source.type === 'preset_scan' ? 'preset_scan' : 'saved_scan';
    const sourceId =
      source.type === 'preset_scan' ? source.presetScanId : source.savedScanId;
    const sourceRevision =
      source.type === 'preset_scan'
        ? source.presetScanRevision
        : source.savedScanRevision;
    const run = (
      await this.connection.database
        .select({ id: scanRuns.id, dataCutoffAt: scanRuns.dataCutoffAt })
        .from(scanRuns)
        .where(
          and(
            eq(scanRuns.requestedBy, input.userId),
            eq(scanRuns.sourceType, sourceType),
            eq(scanRuns.sourceId, sourceId),
            eq(scanRuns.sourceRevision, sourceRevision),
            eq(scanRuns.status, 'completed'),
            lte(scanRuns.dataCutoffAt, input.dataCutoffAt),
          ),
        )
        .orderBy(desc(scanRuns.completedAt), desc(scanRuns.id))
        .limit(1)
    )[0];
    if (run === undefined) {
      return notEvaluableDryRun('SCAN_RESULT_MISSING', input.dataCutoffAt);
    }
    const results = await this.connection.database
      .select({
        instrumentId: scanResults.instrumentId,
        status: scanResults.status,
      })
      .from(scanResults)
      .where(eq(scanResults.scanRunId, run.id));
    let allowedInstrumentIds: Set<string> | null = null;
    if (source.type === 'watchlist_saved_scan') {
      const items = await this.connection.database
        .select({ instrumentId: watchlistItems.instrumentId })
        .from(watchlistItems)
        .where(eq(watchlistItems.watchlistId, source.watchlistId));
      allowedInstrumentIds = new Set(
        items.map(({ instrumentId }) => instrumentId),
      );
    }
    const scoped =
      allowedInstrumentIds === null
        ? results
        : results.filter(({ instrumentId }) =>
            allowedInstrumentIds.has(instrumentId),
          );
    const matchedInstrumentIds = scoped
      .filter(({ status }) => status === 'matched')
      .map(({ instrumentId }) => instrumentId)
      .sort();
    if (matchedInstrumentIds.length > 0) {
      return {
        status: 'matched' as const,
        reasonCode: null,
        matchedInstrumentIds,
        dataCutoffAt: run.dataCutoffAt,
      };
    }
    if (scoped.some(({ status }) => status === 'not_evaluable')) {
      return notEvaluableDryRun('SCAN_RESULT_NOT_EVALUABLE', run.dataCutoffAt);
    }
    return {
      status: 'not_matched' as const,
      reasonCode: null,
      matchedInstrumentIds: [],
      dataCutoffAt: run.dataCutoffAt,
    };
  }

  private async evaluateInstrument(
    input: Parameters<AlertDryRunEvaluator['evaluate']>[0],
  ) {
    const source = input.alert.revision.source;
    const timeframe = input.alert.revision.timeframe;
    if (!('instrumentId' in source) || timeframe === null) {
      return notEvaluableDryRun('ALERT_SOURCE_INVALID', input.dataCutoffAt);
    }
    const bars = await this.loadBars(
      source.instrumentId,
      timeframe as IndicatorTimeframe,
      input.dataCutoffAt,
    );
    if (bars.length === 0) {
      return notEvaluableDryRun('MARKET_DATA_MISSING', input.dataCutoffAt);
    }
    const configuration = input.alert.revision.sourceConfiguration;
    if (source.type === 'instrument_price') {
      const parsed = dryRunThresholdSchema.safeParse(configuration);
      return parsed.success
        ? scalarDryRun(
            bars.at(-1)?.close,
            parsed.data.operator,
            parsed.data.threshold,
            source.instrumentId,
            input.dataCutoffAt,
          )
        : notEvaluableDryRun('ALERT_SOURCE_INVALID', input.dataCutoffAt);
    }
    if (source.type === 'instrument_percent_change') {
      const parsed = dryRunThresholdSchema.safeParse(configuration);
      if (!parsed.success) {
        return notEvaluableDryRun('ALERT_SOURCE_INVALID', input.dataCutoffAt);
      }
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
      return scalarDryRun(
        value,
        parsed.data.operator,
        parsed.data.threshold,
        source.instrumentId,
        input.dataCutoffAt,
      );
    }
    const parsed = dryRunIndicatorSchema.safeParse(configuration);
    if (!parsed.success) {
      return notEvaluableDryRun('ALERT_SOURCE_INVALID', input.dataCutoffAt);
    }
    try {
      const definition = this.indicators.resolve(
        parsed.data.indicatorCode,
        parsed.data.indicatorVersion,
      );
      const parameters = definition.parseParameters(parsed.data.parameters);
      const output = definition.calculate(
        {
          instrumentId: source.instrumentId,
          timeframe: timeframe as IndicatorTimeframe,
          bars,
          adjustmentMode: 'raw',
          dataCutoffAt: input.dataCutoffAt,
        } satisfies IndicatorInput,
        parameters,
      );
      return scalarDryRun(
        latestDryRunOutput(output, parsed.data.outputKey),
        parsed.data.operator,
        parsed.data.threshold,
        source.instrumentId,
        input.dataCutoffAt,
      );
    } catch {
      return notEvaluableDryRun('INDICATOR_NOT_EVALUABLE', input.dataCutoffAt);
    }
  }

  private async loadBars(
    instrumentId: string,
    timeframe: IndicatorTimeframe,
    dataCutoffAt: Date,
  ): Promise<readonly IndicatorPriceBar[]> {
    const rows = await this.connection.database
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

function view(alert: AlertRow, row: RevisionRow): AlertView {
  return {
    id: alert.id,
    ownerUserId: alert.ownerUserId,
    name: alert.name,
    status: alert.status as AlertStatus,
    currentRevision: alert.currentRevision,
    createdAt: alert.createdAt,
    updatedAt: alert.updatedAt,
    deletedAt: alert.deletedAt,
    revision: revision(row),
  };
}

function revision(row: RevisionRow): AlertRevision {
  return createAlertRevision({
    alertId: row.alertId,
    revision: row.revision,
    source: source(row),
    triggerPolicy: row.triggerPolicy as AlertRevision['triggerPolicy'],
    repeatPolicy: row.repeatPolicy as AlertRevision['repeatPolicy'],
    timeframe: row.timeframe,
    evaluationMode: row.evaluationMode as AlertRevision['evaluationMode'],
    sourceConfiguration: row.sourceConfiguration,
    channels: row.channels as AlertRevision['channels'],
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  });
}

function source(row: RevisionRow): AlertSource {
  switch (row.sourceType) {
    case 'saved_scan':
      return {
        type: 'saved_scan',
        savedScanId: row.savedScanId!,
        savedScanRevision: row.savedScanRevision!,
      };
    case 'preset_scan':
      return {
        type: 'preset_scan',
        presetScanId: row.presetScanId!,
        presetScanRevision: row.presetScanRevision!,
      };
    case 'watchlist_saved_scan':
      return {
        type: 'watchlist_saved_scan',
        watchlistId: row.watchlistId!,
        savedScanId: row.savedScanId!,
        savedScanRevision: row.savedScanRevision!,
      };
    case 'instrument_price':
    case 'instrument_percent_change':
    case 'instrument_indicator':
      return { type: row.sourceType, instrumentId: row.instrumentId! };
    default:
      throw new Error('Unsupported alert source type');
  }
}

function revisionValues(
  value: AlertRevision,
): typeof alertRevisions.$inferInsert {
  return {
    alertId: value.alertId,
    revision: value.revision,
    sourceType: value.source.type,
    savedScanId:
      'savedScanId' in value.source ? value.source.savedScanId : null,
    savedScanRevision:
      'savedScanRevision' in value.source
        ? value.source.savedScanRevision
        : null,
    presetScanId:
      'presetScanId' in value.source ? value.source.presetScanId : null,
    presetScanRevision:
      'presetScanRevision' in value.source
        ? value.source.presetScanRevision
        : null,
    instrumentId:
      'instrumentId' in value.source ? value.source.instrumentId : null,
    watchlistId:
      'watchlistId' in value.source ? value.source.watchlistId : null,
    triggerPolicy: value.triggerPolicy,
    repeatPolicy: value.repeatPolicy,
    timeframe: value.timeframe,
    evaluationMode: value.evaluationMode,
    sourceConfiguration: value.sourceConfiguration,
    channels: value.channels,
    createdBy: value.createdBy,
    createdAt: value.createdAt,
  };
}

function scalarDryRun(
  value: number | null | undefined,
  operator: z.infer<typeof dryRunOperatorSchema>,
  threshold: number,
  instrumentId: string,
  dataCutoffAt: Date,
) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return notEvaluableDryRun('VALUE_NOT_EVALUABLE', dataCutoffAt);
  }
  const matched = compareDryRun(value, operator, threshold);
  return {
    status: matched ? ('matched' as const) : ('not_matched' as const),
    reasonCode: null,
    matchedInstrumentIds: matched ? [instrumentId] : [],
    dataCutoffAt,
  };
}

function compareDryRun(
  value: number,
  operator: z.infer<typeof dryRunOperatorSchema>,
  threshold: number,
): boolean {
  if (operator === 'GT') return value > threshold;
  if (operator === 'GTE') return value >= threshold;
  if (operator === 'LT') return value < threshold;
  if (operator === 'LTE') return value <= threshold;
  return value === threshold;
}

function latestDryRunOutput(
  output: IndicatorOutput,
  outputKey: string | undefined,
): number | null {
  if (output.kind === 'scalar') return output.values.at(-1) ?? null;
  if (outputKey === undefined) return null;
  return output.outputs[outputKey]?.at(-1) ?? null;
}

function notEvaluableDryRun(reasonCode: string, dataCutoffAt: Date) {
  return {
    status: 'not_evaluable' as const,
    reasonCode,
    matchedInstrumentIds: [],
    dataCutoffAt,
  };
}
