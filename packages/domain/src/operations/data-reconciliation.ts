import { createHash } from 'node:crypto';

export const DATA_QUALITY_FINDING_TYPES = [
  'missingBar',
  'duplicateBar',
  'invalidOhlc',
  'volumeAnomaly',
  'staleData',
  'fundamentalPeriodGap',
  'restatementMismatch',
  'corporateActionMismatch',
  'benchmarkGap',
  'internalProviderMismatch',
  'crossProviderMismatch',
] as const;
export type DataQualityFindingType =
  (typeof DATA_QUALITY_FINDING_TYPES)[number];

export const CORRECTION_STATES = [
  'open',
  'investigating',
  'approved',
  'rejected',
  'replayQueued',
  'replaying',
  'resolved',
  'failed',
] as const;
export type CorrectionState = (typeof CORRECTION_STATES)[number];

export interface QualityFinding {
  readonly fingerprint: string;
  readonly type: DataQualityFindingType;
  readonly severity: 'info' | 'warning' | 'critical';
  readonly resourceType: string;
  readonly resourceKey: string;
  readonly evidence: Readonly<Record<string, unknown>>;
}

export interface PriceObservation {
  readonly key: string;
  readonly at: Date;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
}

export interface CorrectionRequest {
  readonly id: string;
  readonly state: CorrectionState;
  readonly version: number;
  readonly findingId: string;
  readonly targetRevisionId?: string;
  readonly replayIdempotencyKey?: string;
  readonly rebuildStatus:
    | 'not_requested'
    | 'stale'
    | 'rebuilding'
    | 'fresh'
    | 'failed';
}

const transitions: Readonly<
  Record<CorrectionState, readonly CorrectionState[]>
> = {
  open: ['investigating', 'rejected'],
  investigating: ['approved', 'rejected'],
  approved: ['replayQueued', 'rejected'],
  rejected: [],
  replayQueued: ['replaying', 'failed'],
  replaying: ['resolved', 'failed'],
  resolved: [],
  failed: ['replayQueued'],
};

export function transitionCorrection(
  current: CorrectionRequest,
  input: {
    readonly next: CorrectionState;
    readonly expectedVersion: number;
    readonly reason: string;
    readonly confirmation?: string;
    readonly targetRevisionId?: string;
    readonly replayIdempotencyKey?: string;
  },
): CorrectionRequest {
  if (input.expectedVersion !== current.version)
    throw new Error('CORRECTION_VERSION_CONFLICT');
  if (input.reason.trim().length < 8)
    throw new Error('CORRECTION_REASON_INVALID');
  if (!transitions[current.state].includes(input.next))
    throw new Error('CORRECTION_TRANSITION_INVALID');
  const dangerous = input.next === 'replayQueued';
  if (dangerous && input.confirmation !== 'QUEUE_CONTROLLED_REPLAY')
    throw new Error('DANGEROUS_CONFIRMATION_INVALID');
  if (dangerous && input.targetRevisionId === undefined)
    throw new Error('TARGET_REVISION_REQUIRED');
  if (dangerous && input.replayIdempotencyKey === undefined)
    throw new Error('REPLAY_IDEMPOTENCY_KEY_REQUIRED');
  return {
    ...current,
    state: input.next,
    version: current.version + 1,
    ...(input.targetRevisionId === undefined
      ? {}
      : { targetRevisionId: input.targetRevisionId }),
    ...(input.replayIdempotencyKey === undefined
      ? {}
      : { replayIdempotencyKey: input.replayIdempotencyKey }),
    rebuildStatus: dangerous ? 'stale' : current.rebuildStatus,
  };
}

export class ReplayDeduplicator {
  private readonly processed = new Set<string>();

  execute<T>(key: string, replay: () => T): { duplicate: boolean; value?: T } {
    if (this.processed.has(key)) return { duplicate: true };
    const value = replay();
    this.processed.add(key);
    return { duplicate: false, value };
  }
}

export function missingBarFindings(
  expected: readonly Date[],
  actual: readonly PriceObservation[],
  resourceKey: string,
): readonly QualityFinding[] {
  const observed = new Set(actual.map((bar) => bar.at.toISOString()));
  return expected
    .filter((at) => !observed.has(at.toISOString()))
    .map((at) =>
      finding('missingBar', 'warning', 'priceBar', resourceKey, {
        expectedAt: at.toISOString(),
      }),
    );
}

export function duplicateBarFindings(
  bars: readonly PriceObservation[],
  resourceKey: string,
): readonly QualityFinding[] {
  const counts = new Map<string, number>();
  for (const bar of bars)
    counts.set(
      bar.at.toISOString(),
      (counts.get(bar.at.toISOString()) ?? 0) + 1,
    );
  return [...counts]
    .filter(([, count]) => count > 1)
    .map(([at, count]) =>
      finding('duplicateBar', 'critical', 'priceBar', resourceKey, {
        at,
        count,
      }),
    );
}

export function invalidOhlcFindings(
  bars: readonly PriceObservation[],
  resourceKey: string,
): readonly QualityFinding[] {
  return bars
    .filter(
      (bar) =>
        !Number.isFinite(bar.open) ||
        !Number.isFinite(bar.high) ||
        !Number.isFinite(bar.low) ||
        !Number.isFinite(bar.close) ||
        bar.low > Math.min(bar.open, bar.close) ||
        bar.high < Math.max(bar.open, bar.close) ||
        bar.high < bar.low ||
        bar.volume < 0,
    )
    .map((bar) =>
      finding('invalidOhlc', 'critical', 'priceBar', resourceKey, {
        at: bar.at.toISOString(),
      }),
    );
}

export function volumeAnomalyFindings(
  bars: readonly PriceObservation[],
  resourceKey: string,
  multiplier = 20,
): readonly QualityFinding[] {
  const positive = bars.map((bar) => bar.volume).filter((volume) => volume > 0);
  const median = [...positive].sort((a, b) => a - b)[
    Math.floor(positive.length / 2)
  ];
  if (median === undefined) return [];
  return bars
    .filter((bar) => bar.volume > median * multiplier)
    .map((bar) =>
      finding('volumeAnomaly', 'warning', 'priceBar', resourceKey, {
        at: bar.at.toISOString(),
        median,
        observed: bar.volume,
      }),
    );
}

export function staleDataFinding(input: {
  readonly resourceType: string;
  readonly resourceKey: string;
  readonly latestAt: Date;
  readonly now: Date;
  readonly maximumAgeMs: number;
}): QualityFinding | null {
  const ageMs = input.now.getTime() - input.latestAt.getTime();
  return ageMs > input.maximumAgeMs
    ? finding('staleData', 'critical', input.resourceType, input.resourceKey, {
        ageMs,
        latestAt: input.latestAt.toISOString(),
      })
    : null;
}

export function sequenceGapFindings(input: {
  readonly type: 'fundamentalPeriodGap' | 'benchmarkGap';
  readonly resourceType: string;
  readonly resourceKey: string;
  readonly expected: readonly string[];
  readonly actual: readonly string[];
}): readonly QualityFinding[] {
  const observed = new Set(input.actual);
  return input.expected
    .filter((period) => !observed.has(period))
    .map((period) =>
      finding(input.type, 'warning', input.resourceType, input.resourceKey, {
        missingPeriod: period,
      }),
    );
}

export function mismatchFinding(input: {
  readonly type:
    | 'restatementMismatch'
    | 'corporateActionMismatch'
    | 'internalProviderMismatch'
    | 'crossProviderMismatch';
  readonly resourceType: string;
  readonly resourceKey: string;
  readonly leftHash: string;
  readonly rightHash: string;
}): QualityFinding | null {
  if (input.leftHash === input.rightHash) return null;
  return finding(input.type, 'warning', input.resourceType, input.resourceKey, {
    leftHash: input.leftHash,
    rightHash: input.rightHash,
  });
}

export function deduplicateFindings(
  findings: readonly QualityFinding[],
): readonly QualityFinding[] {
  return [
    ...new Map(findings.map((item) => [item.fingerprint, item])).values(),
  ];
}

export function pointInTimeRevision<T extends { readonly availableAt: Date }>(
  revisions: readonly T[],
  cutoff: Date,
): T | null {
  return (
    revisions
      .filter((revision) => revision.availableAt <= cutoff)
      .sort(
        (left, right) =>
          right.availableAt.getTime() - left.availableAt.getTime(),
      )[0] ?? null
  );
}

export function correctionInvalidationScopes(resourceKey: string) {
  return [
    `market:${resourceKey}`,
    `scanner:${resourceKey}`,
    `portfolio:${resourceKey}`,
    `backtest:${resourceKey}`,
  ] as const;
}

function finding(
  type: DataQualityFindingType,
  severity: QualityFinding['severity'],
  resourceType: string,
  resourceKey: string,
  evidence: Readonly<Record<string, unknown>>,
): QualityFinding {
  const fingerprint = createHash('sha256')
    .update(
      JSON.stringify({
        evidence,
        resourceKey,
        resourceType,
        type,
      }),
    )
    .digest('hex');
  return { evidence, fingerprint, resourceKey, resourceType, severity, type };
}
