import { describe, expect, it, vi } from 'vitest';

import {
  correctionInvalidationScopes,
  deduplicateFindings,
  duplicateBarFindings,
  invalidOhlcFindings,
  mismatchFinding,
  missingBarFindings,
  pointInTimeRevision,
  ReplayDeduplicator,
  sequenceGapFindings,
  staleDataFinding,
  transitionCorrection,
  volumeAnomalyFindings,
  type CorrectionRequest,
  type PriceObservation,
} from './data-reconciliation';

const at = (day: number) =>
  new Date(`2026-01-${String(day).padStart(2, '0')}T00:00:00Z`);
const bar = (
  day: number,
  overrides: Partial<PriceObservation> = {},
): PriceObservation => ({
  at: at(day),
  close: 11,
  high: 12,
  key: `bar-${day}`,
  low: 9,
  open: 10,
  volume: 100,
  ...overrides,
});
const correction: CorrectionRequest = {
  findingId: 'finding-1',
  id: 'correction-1',
  rebuildStatus: 'not_requested',
  state: 'open',
  version: 1,
};

describe('data reconciliation and controlled correction', () => {
  it('detects a missing bar', () =>
    expect(missingBarFindings([at(1), at(2)], [bar(1)], 'X')).toHaveLength(1));
  it('detects a duplicate bar', () =>
    expect(duplicateBarFindings([bar(1), bar(1)], 'X')).toHaveLength(1));
  it('detects invalid OHLC', () =>
    expect(invalidOhlcFindings([bar(1, { high: 8 })], 'X')).toHaveLength(1));
  it('detects a volume anomaly', () =>
    expect(
      volumeAnomalyFindings([bar(1), bar(2), bar(3, { volume: 3_000 })], 'X'),
    ).toHaveLength(1));
  it('detects stale data', () =>
    expect(
      staleDataFinding({
        latestAt: at(1),
        maximumAgeMs: 1,
        now: at(2),
        resourceKey: 'X',
        resourceType: 'priceBar',
      }),
    ).not.toBeNull());
  it('detects a fundamental period gap', () =>
    expect(
      sequenceGapFindings({
        actual: ['2025Q1'],
        expected: ['2025Q1', '2025Q2'],
        resourceKey: 'X',
        resourceType: 'fundamental',
        type: 'fundamentalPeriodGap',
      }),
    ).toHaveLength(1));
  it('detects a benchmark gap', () =>
    expect(
      sequenceGapFindings({
        actual: [],
        expected: ['2025-01-01'],
        resourceKey: 'X',
        resourceType: 'benchmark',
        type: 'benchmarkGap',
      }),
    ).toHaveLength(1));
  it('detects a corporate action mismatch', () =>
    expect(
      mismatchFinding({
        leftHash: 'a',
        resourceKey: 'X',
        resourceType: 'corporateAction',
        rightHash: 'b',
        type: 'corporateActionMismatch',
      }),
    ).not.toBeNull());
  it('detects internal/provider and cross-provider mismatches', () => {
    expect(
      ['internalProviderMismatch', 'crossProviderMismatch'].map((type) =>
        mismatchFinding({
          leftHash: 'a',
          resourceKey: 'X',
          resourceType: 'priceBar',
          rightHash: 'b',
          type: type as 'internalProviderMismatch',
        }),
      ),
    ).not.toContain(null);
  });
  it('deduplicates findings by deterministic fingerprint', () => {
    const findings = missingBarFindings([at(1)], [], 'X');
    expect(deduplicateFindings([...findings, ...findings])).toHaveLength(1);
  });
  it('enforces correction state transitions and versioning', () => {
    const investigating = transitionCorrection(correction, {
      expectedVersion: 1,
      next: 'investigating',
      reason: 'Verify provider record',
    });
    expect(investigating).toMatchObject({ state: 'investigating', version: 2 });
    expect(() =>
      transitionCorrection(investigating, {
        expectedVersion: 1,
        next: 'approved',
        reason: 'Approved correction evidence',
      }),
    ).toThrow('CORRECTION_VERSION_CONFLICT');
  });
  it('requires exact dangerous confirmation and revision identity', () => {
    const approved = { ...correction, state: 'approved' as const };
    expect(() =>
      transitionCorrection(approved, {
        confirmation: 'YES',
        expectedVersion: 1,
        next: 'replayQueued',
        reason: 'Replay corrected provider revision',
      }),
    ).toThrow('DANGEROUS_CONFIRMATION_INVALID');
  });
  it('queues only an immutable revision and marks read models stale', () => {
    const queued = transitionCorrection(
      { ...correction, state: 'approved' },
      {
        confirmation: 'QUEUE_CONTROLLED_REPLAY',
        expectedVersion: 1,
        next: 'replayQueued',
        reason: 'Replay corrected provider revision',
        replayIdempotencyKey: 'replay-1',
        targetRevisionId: 'revision-1',
      },
    );
    expect(queued).toMatchObject({
      rebuildStatus: 'stale',
      targetRevisionId: 'revision-1',
    });
  });
  it('makes replay idempotent', () => {
    const replay = vi.fn(() => 'queued');
    const deduplicator = new ReplayDeduplicator();
    expect(deduplicator.execute('one', replay).duplicate).toBe(false);
    expect(deduplicator.execute('one', replay).duplicate).toBe(true);
    expect(replay).toHaveBeenCalledTimes(1);
  });
  it('invalidates market, scanner, portfolio and backtest scopes', () =>
    expect(correctionInvalidationScopes('X')).toEqual([
      'market:X',
      'scanner:X',
      'portfolio:X',
      'backtest:X',
    ]));
  it('keeps backtest snapshots isolated by available-at', () => {
    const revisions = [
      { availableAt: at(1), revision: 1 },
      { availableAt: at(3), revision: 2 },
    ];
    expect(pointInTimeRevision(revisions, at(2))?.revision).toBe(1);
  });
  it('returns no mismatch when evidence agrees', () =>
    expect(
      mismatchFinding({
        leftHash: 'same',
        resourceKey: 'X',
        resourceType: 'fundamental',
        rightHash: 'same',
        type: 'restatementMismatch',
      }),
    ).toBeNull());
  it('does not fabricate a stale finding for fresh data', () =>
    expect(
      staleDataFinding({
        latestAt: at(2),
        maximumAgeMs: 86_400_000,
        now: at(2),
        resourceKey: 'X',
        resourceType: 'priceBar',
      }),
    ).toBeNull());
});
