import { createStableParameterHash } from '../indicators/parameter-hash.js';
import type {
  BacktestPointInTimePolicy,
  HistoricalUniverseInstrument,
  PointInTimeFundamentalRevision,
  BacktestTimelineEvent,
} from './contracts.js';

export function isInstrumentEligibleAt(
  policy: BacktestPointInTimePolicy | undefined,
  instrumentId: string,
  eventTime: string,
): boolean {
  if (policy === undefined) return true;
  if (Date.parse(eventTime) > Date.parse(policy.dataCutoffAt)) return false;
  const instrument = policy.instruments.find(
    (item) => item.instrumentId === instrumentId,
  );
  if (instrument === undefined) return false;
  const time = Date.parse(eventTime);
  if (
    time < Date.parse(instrument.listedAt) ||
    (instrument.delistedAt !== null && time > Date.parse(instrument.delistedAt))
  ) {
    return false;
  }
  if (policy.requiredIndexCodes.length === 0) return true;
  return policy.requiredIndexCodes.every((indexCode) =>
    instrument.memberships.some(
      (membership) =>
        membership.indexCode === indexCode &&
        time >= Date.parse(membership.effectiveFrom) &&
        (membership.effectiveTo === null ||
          time <= Date.parse(membership.effectiveTo)),
    ),
  );
}

export function selectPointInTimeFundamental(
  revisions: readonly PointInTimeFundamentalRevision[],
  input: {
    readonly instrumentId: string;
    readonly metricCode: string;
    readonly asOf: string;
    readonly dataCutoffAt: string;
  },
): PointInTimeFundamentalRevision | null {
  const effectiveTime = Math.min(
    Date.parse(input.asOf),
    Date.parse(input.dataCutoffAt),
  );
  return (
    revisions
      .filter(
        (revision) =>
          revision.instrumentId === input.instrumentId &&
          revision.metricCode === input.metricCode &&
          Date.parse(revision.publishedAt) <= effectiveTime &&
          Date.parse(revision.revisionAvailableAt) <= effectiveTime,
      )
      .sort(
        (left, right) =>
          Date.parse(right.revisionAvailableAt) -
            Date.parse(left.revisionAvailableAt) ||
          right.providerRevision.localeCompare(left.providerRevision),
      )[0] ?? null
  );
}

export function createHistoricalUniverseSnapshotHash(input: {
  readonly universeVersion: string;
  readonly instruments: readonly HistoricalUniverseInstrument[];
}): string {
  return createStableParameterHash({
    universeVersion: input.universeVersion,
    instruments: [...input.instruments]
      .sort((left, right) =>
        left.instrumentId.localeCompare(right.instrumentId),
      )
      .map((instrument) => ({
        ...instrument,
        memberships: [...instrument.memberships].sort(
          (left, right) =>
            left.indexCode.localeCompare(right.indexCode) ||
            left.effectiveFrom.localeCompare(right.effectiveFrom),
        ),
      })),
  });
}

export function createBacktestDataSnapshotHash(input: {
  readonly marketEvents: readonly BacktestTimelineEvent[];
  readonly universeSnapshotHash: string;
  readonly fundamentalRevisionIds: readonly string[];
  readonly corporateActionRevisionIds: readonly string[];
  readonly dataCutoffAt: string;
}): string {
  return createStableParameterHash({
    marketEvents: [...input.marketEvents].sort(
      (left, right) =>
        left.timestamp.localeCompare(right.timestamp) ||
        left.eventId.localeCompare(right.eventId),
    ),
    universeSnapshotHash: input.universeSnapshotHash,
    fundamentalRevisionIds: [...input.fundamentalRevisionIds].sort(),
    corporateActionRevisionIds: [...input.corporateActionRevisionIds].sort(),
    dataCutoffAt: input.dataCutoffAt,
  });
}
