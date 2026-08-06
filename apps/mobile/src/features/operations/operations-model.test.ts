import { describe, expect, it } from 'vitest';
import {
  CursorPageLedger,
  DeviceRegistrationLedger,
  IdempotentRunRequests,
  PushDeduplicator,
  countConditions,
  isQuietHour,
  mutationAllowed,
  redactOperationsTelemetry,
  safePushPayload,
  validatePushTarget,
  validateScanAst,
  type ScanGroup,
} from './operations-model';

const condition = {
  id: 'c-1',
  field: 'rsi' as const,
  operator: 'gt' as const,
  value: 55,
  period: 14,
};
const group = (overrides: Partial<ScanGroup> = {}): ScanGroup => ({
  combinator: 'AND',
  conditions: [condition],
  ...overrides,
});
const uuid1 = '81000000-0000-4000-8000-000000000001';
const uuid2 = '81000000-0000-4000-8000-000000000002';

describe('scanner AST safety', () => {
  it('accepts an allowlisted condition', () =>
    expect(validateScanAst(group())).toEqual(group()));
  it('counts nested conditions', () =>
    expect(countConditions(group({ groups: [group()] }))).toBe(2));
  it('rejects an empty group', () =>
    expect(() => validateScanAst(group({ conditions: [] }))).toThrow(
      'SCAN_GROUP_EMPTY',
    ));
  it('rejects invalid ranges', () =>
    expect(() =>
      validateScanAst(
        group({ conditions: [{ ...condition, secondaryValue: 10 }] }),
      ),
    ).toThrow('SCAN_RANGE_INVALID'));
  it('rejects unsupported fields', () =>
    expect(() =>
      validateScanAst(
        group({ conditions: [{ ...condition, field: 'rawSql' as never }] }),
      ),
    ).toThrow());
  it('rejects unsupported operators', () =>
    expect(() =>
      validateScanAst(
        group({ conditions: [{ ...condition, operator: 'eval' as never }] }),
      ),
    ).toThrow());
  it('rejects invalid periods', () =>
    expect(() =>
      validateScanAst(group({ conditions: [{ ...condition, period: 1 }] })),
    ).toThrow());
  it('rejects non-finite values', () =>
    expect(() =>
      validateScanAst(
        group({ conditions: [{ ...condition, value: Number.NaN }] }),
      ),
    ).toThrow());
  it('rejects too many conditions', () =>
    expect(() =>
      validateScanAst(
        group({
          conditions: Array.from({ length: 26 }, (_, index) => ({
            ...condition,
            id: `c-${index}`,
          })),
        }),
      ),
    ).toThrow('SCAN_CONDITION_LIMIT'));
  it('rejects nesting deeper than four', () => {
    const deep = group({
      groups: [
        group({ groups: [group({ groups: [group({ groups: [group()] })] })] }),
      ],
    });
    expect(() => validateScanAst(deep)).toThrow('SCAN_NESTING_LIMIT');
  });
  it.each([
    'close',
    'changePercent',
    'volume',
    'relativeVolume',
    'rsi',
    'sma',
    'ema',
    'macd',
    'pattern',
    'fundamental',
  ] as const)('accepts allowlisted field %s', (field) =>
    expect(
      validateScanAst(group({ conditions: [{ ...condition, field }] })),
    ).toBeTruthy(),
  );
  it.each([
    'gt',
    'gte',
    'lt',
    'lte',
    'crossesAbove',
    'crossesBelow',
    'equals',
  ] as const)('accepts allowlisted operator %s', (operator) =>
    expect(
      validateScanAst(group({ conditions: [{ ...condition, operator }] })),
    ).toBeTruthy(),
  );
});

describe('run and cursor contracts', () => {
  it('deduplicates run submission', () => {
    const ledger = new IdempotentRunRequests();
    let count = 0;
    expect(ledger.request('key', () => `run-${++count}`)).toBe(
      ledger.request('key', () => `run-${++count}`),
    );
    expect(count).toBe(1);
  });
  it('keeps different idempotency keys separate', () => {
    const ledger = new IdempotentRunRequests();
    expect(ledger.request('a', () => 'one')).not.toBe(
      ledger.request('b', () => 'two'),
    );
  });
  it('appends real cursor pages once', () => {
    const ledger = new CursorPageLedger<number>();
    ledger.add('c1', [1, 2]);
    ledger.add('c2', [3]);
    expect(ledger.list()).toEqual([1, 2, 3]);
  });
  it('does not append a cursor twice', () => {
    const ledger = new CursorPageLedger<number>();
    ledger.add('c1', [1]);
    ledger.add('c1', [2]);
    expect(ledger.list()).toEqual([1]);
  });
});

describe('push payload and dedup', () => {
  it('builds a minimal symbol payload', () =>
    expect(
      safePushPayload({
        type: 'alert',
        eventId: uuid1,
        target: { kind: 'symbol', id: 'THYAO' },
      }),
    ).not.toHaveProperty('token'));
  it('rejects arbitrary symbol routes', () =>
    expect(() =>
      validatePushTarget({ kind: 'symbol', id: '../admin' }),
    ).toThrow('PUSH_TARGET_INVALID'));
  it.each(['alert', 'scan-result', 'watchlist'] as const)(
    'accepts UUID target %s',
    (kind) => expect(validatePushTarget({ kind, id: uuid1 })).toBeTruthy(),
  );
  it('rejects malformed resource IDs', () =>
    expect(() => validatePushTarget({ kind: 'alert', id: 'bad' })).toThrow());
  it('rejects malformed event IDs', () =>
    expect(() =>
      safePushPayload({
        type: 'scan',
        eventId: 'event',
        target: { kind: 'symbol', id: 'ASELS' },
      }),
    ).toThrow());
  it('uses generic lock-screen copy', () =>
    expect(
      safePushPayload({
        type: 'system',
        eventId: uuid1,
        target: { kind: 'symbol', id: 'ASELS' },
      }).body,
    ).not.toContain('ASELS'));
  it('deduplicates the same event/device/channel', () => {
    const dedup = new PushDeduplicator();
    expect(dedup.accept(uuid1, 'device', 'push')).toBe(true);
    expect(dedup.accept(uuid1, 'device', 'push')).toBe(false);
  });
  it('allows another channel', () => {
    const dedup = new PushDeduplicator();
    dedup.accept(uuid1, 'device', 'push');
    expect(dedup.accept(uuid1, 'device', 'in-app')).toBe(true);
  });
  it('allows another device', () => {
    const dedup = new PushDeduplicator();
    dedup.accept(uuid1, 'one', 'push');
    expect(dedup.accept(uuid1, 'two', 'push')).toBe(true);
  });
});

describe('device ownership lifecycle', () => {
  const device = {
    installationId: 'install-1',
    tokenFingerprint: 'sha256:a',
    userId: uuid1,
    environment: 'development' as const,
    revokedAt: null,
  };
  it('registers an owner-scoped installation', () =>
    expect(new DeviceRegistrationLedger().register(device)).toEqual(device));
  it('rejects token takeover by another user', () => {
    const ledger = new DeviceRegistrationLedger();
    ledger.register(device);
    expect(() => ledger.register({ ...device, userId: uuid2 })).toThrow(
      'DEVICE_OWNERSHIP_CONFLICT',
    );
  });
  it('rotates a fingerprint without exposing raw token', () => {
    const ledger = new DeviceRegistrationLedger();
    ledger.register(device);
    expect(ledger.rotate(uuid1, 'install-1', 'sha256:b').tokenFingerprint).toBe(
      'sha256:b',
    );
  });
  it('rejects foreign rotation', () => {
    const ledger = new DeviceRegistrationLedger();
    ledger.register(device);
    expect(() => ledger.rotate(uuid2, 'install-1', 'sha256:b')).toThrow(
      'DEVICE_ACCESS_DENIED',
    );
  });
  it('revokes on logout', () => {
    const ledger = new DeviceRegistrationLedger();
    ledger.register(device);
    expect(
      ledger.revoke(uuid1, 'install-1', '2026-08-06T00:00:00Z').revokedAt,
    ).not.toBeNull();
  });
  it('rejects foreign revocation', () => {
    const ledger = new DeviceRegistrationLedger();
    ledger.register(device);
    expect(() =>
      ledger.revoke(uuid2, 'install-1', '2026-08-06T00:00:00Z'),
    ).toThrow('DEVICE_ACCESS_DENIED');
  });
});

describe('quiet hours, offline and telemetry', () => {
  it('detects daytime quiet hours', () =>
    expect(
      isQuietHour({ minute: 600, start: 540, end: 1020, security: false }),
    ).toBe(true));
  it('detects overnight first segment', () =>
    expect(
      isQuietHour({ minute: 1380, start: 1320, end: 420, security: false }),
    ).toBe(true));
  it('detects overnight second segment', () =>
    expect(
      isQuietHour({ minute: 300, start: 1320, end: 420, security: false }),
    ).toBe(true));
  it('leaves daytime outside overnight hours', () =>
    expect(
      isQuietHour({ minute: 720, start: 1320, end: 420, security: false }),
    ).toBe(false));
  it('never suppresses security notifications', () =>
    expect(
      isQuietHour({ minute: 1380, start: 1320, end: 420, security: true }),
    ).toBe(false));
  it('rejects zero-length quiet hours', () =>
    expect(() =>
      isQuietHour({ minute: 60, start: 60, end: 60, security: false }),
    ).toThrow('QUIET_HOURS_INVALID'));
  it('allows online mutation', () => expect(mutationAllowed(true)).toBe(true));
  it('blocks offline mutation', () =>
    expect(() => mutationAllowed(false)).toThrow('OFFLINE_MUTATION_BLOCKED'));
  it('redacts sensitive telemetry fields', () =>
    expect(
      redactOperationsTelemetry('scan_saved', {
        ast: {},
        token: 'x',
        status: 'ok',
      }),
    ).toEqual({ event: 'scan_saved', attributes: { status: 'ok' } }));
  it.each([
    'deviceToken',
    'watchlistId',
    'threshold',
    'symbolList',
    'providerCredential',
    'rawPayload',
  ])('redacts %s', (key) =>
    expect(
      redactOperationsTelemetry('event', { [key]: 'secret' }).attributes,
    ).toEqual({}),
  );
});
