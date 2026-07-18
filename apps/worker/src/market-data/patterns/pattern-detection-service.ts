import {
  createCorePatternRegistry,
  PatternExecutor,
  type AdjustmentMode,
  type IndicatorTimeframe,
  type PatternBar,
  type PatternDetection,
} from '@atlas/domain';

export interface PatternDetectionStore {
  loadClosedBars(input: {
    instrumentIds: readonly string[];
    timeframe: IndicatorTimeframe;
    dataCutoffAt: Date;
    limit: number;
  }): Promise<ReadonlyMap<string, readonly PatternBar[]>>;
  transitionCandidates(input: {
    instrumentIds: readonly string[];
    timeframe: IndicatorTimeframe;
    adjustmentMode: AdjustmentMode;
    dataCutoffAt: Date;
    latestCloses: ReadonlyMap<string, { time: Date; close: number }>;
  }): Promise<{ confirmed: number; invalidated: number }>;
  persist(
    detections: readonly PatternDetection[],
  ): Promise<{ inserted: number; duplicates: number }>;
}

export class PatternDetectionService {
  private readonly registry = createCorePatternRegistry();
  private readonly executor = new PatternExecutor(this.registry);
  constructor(private readonly store: PatternDetectionStore) {}

  async execute(input: {
    instrumentIds: readonly string[];
    timeframe: IndicatorTimeframe;
    adjustmentMode: AdjustmentMode;
    dataCutoffAt: Date;
  }) {
    const barsByInstrument = await this.store.loadClosedBars({
      ...input,
      limit: 260,
    });
    const latestCloses = new Map<string, { time: Date; close: number }>();
    for (const [instrumentId, bars] of barsByInstrument) {
      const latest = bars.at(-1);
      if (latest?.close !== null && latest?.close !== undefined)
        latestCloses.set(instrumentId, {
          time: latest.timestamp,
          close: latest.close,
        });
    }
    const transitions = await this.store.transitionCandidates({
      ...input,
      latestCloses,
    });
    const requests = this.registry
      .catalog()
      .map(({ code, version }) => ({ code, version }));
    const detections: PatternDetection[] = [];
    let notEvaluable = 0;
    for (const instrumentId of input.instrumentIds) {
      const results = this.executor.execute(
        {
          instrumentId,
          timeframe: input.timeframe,
          adjustmentMode: input.adjustmentMode,
          dataCutoffAt: input.dataCutoffAt,
          bars: barsByInstrument.get(instrumentId) ?? [],
        },
        requests,
      );
      for (const result of results) {
        if (result.status === 'detected') detections.push(result.detection);
        else notEvaluable += 1;
      }
    }
    const persistence = await this.store.persist(detections);
    return {
      evaluatedInstruments: input.instrumentIds.length,
      detections: detections.length,
      notEvaluable,
      ...persistence,
      transitions,
    };
  }
}
