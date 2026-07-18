import { createHash } from 'node:crypto';
import type {
  PatternDetection,
  PatternExecutionRequest,
  PatternExecutionResult,
  PatternInput,
  PatternNotEvaluable,
} from './contracts.js';
import { PatternRegistry } from './registry.js';

export class PatternExecutor {
  constructor(private readonly registry: PatternRegistry) {}

  execute(
    input: PatternInput,
    requests: readonly PatternExecutionRequest[],
  ): readonly PatternExecutionResult[] {
    const bars = input.bars.filter(
      (bar) => bar.isClosed && bar.timestamp <= input.dataCutoffAt,
    );
    const safeInput = { ...input, bars };
    return requests.map((request) => this.executeOne(safeInput, request));
  }

  private executeOne(
    input: PatternInput,
    request: PatternExecutionRequest,
  ): PatternExecutionResult {
    const definition = this.registry.resolve(request.code, request.version);
    if (input.bars.length < definition.minimumInput)
      return notEvaluable(definition, 'INPUT_TOO_SHORT');
    if (!validBars(input.bars, definition.requiredFields))
      return notEvaluable(
        definition,
        definition.requiredFields.includes('volume')
          ? 'MISSING_VOLUME'
          : 'INPUT_INVALID',
      );
    let parameters: unknown;
    try {
      parameters = definition.parameterSchema.parse(request.parameters ?? {});
    } catch {
      return notEvaluable(definition, 'INPUT_INVALID');
    }
    const detected = definition.detect(input, parameters);
    if (!detected) return notEvaluable(definition, 'NO_MATCH');
    const core = {
      ...detected,
      patternCode: definition.code,
      patternVersion: definition.version,
      algorithmVersion: definition.algorithmVersion,
      instrumentId: input.instrumentId,
      timeframe: input.timeframe,
      adjustmentMode: input.adjustmentMode,
      dataCutoffAt: input.dataCutoffAt,
    };
    const detection: PatternDetection = {
      ...core,
      deduplicationKey: deduplicationKey(core),
    };
    assertFinite(detection);
    return { status: 'detected', detection };
  }
}

function notEvaluable(
  definition: { code: string; version: number },
  reasonCode: PatternNotEvaluable['reasonCode'],
): PatternExecutionResult {
  return {
    status: 'not_evaluable',
    patternCode: definition.code,
    patternVersion: definition.version,
    reasonCode,
    warnings: [],
  };
}

function validBars(bars: PatternInput['bars'], fields: readonly string[]) {
  let previous = -Infinity;
  for (const bar of bars) {
    const time = bar.timestamp.getTime();
    if (!Number.isFinite(time) || time <= previous) return false;
    previous = time;
    for (const field of fields) {
      const value = bar[field as 'open' | 'high' | 'low' | 'close' | 'volume'];
      if (value === null || !Number.isFinite(value)) return false;
    }
  }
  return true;
}

function deduplicationKey(value: Omit<PatternDetection, 'deduplicationKey'>) {
  const evidence = value.evidencePoints.map((point) => ({
    time: point.time.toISOString(),
    price: point.price,
    role: point.role,
  }));
  return createHash('sha256')
    .update(
      JSON.stringify({
        instrumentId: value.instrumentId,
        timeframe: value.timeframe,
        code: value.patternCode,
        version: value.patternVersion,
        startTime: value.startTime.toISOString(),
        evidence,
      }),
    )
    .digest('hex');
}

function assertFinite(value: unknown) {
  if (JSON.stringify(value).match(/(?:NaN|Infinity)/u))
    throw new Error('PATTERN_OUTPUT_INVALID');
}
