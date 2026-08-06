import { z } from 'zod';

export const scannerFields = [
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
] as const;
export const scannerOperators = [
  'gt',
  'gte',
  'lt',
  'lte',
  'crossesAbove',
  'crossesBelow',
  'equals',
] as const;

const conditionSchema = z.object({
  id: z.string().min(1).max(64),
  field: z.enum(scannerFields),
  operator: z.enum(scannerOperators),
  value: z.number().finite().min(-1_000_000_000).max(1_000_000_000),
  secondaryValue: z.number().finite().optional(),
  period: z.number().int().min(2).max(500).optional(),
});

export type ScanCondition = z.infer<typeof conditionSchema>;
export interface ScanGroup {
  readonly combinator: 'AND' | 'OR';
  readonly conditions: readonly ScanCondition[];
  readonly groups?: readonly ScanGroup[];
}

export function validateScanAst(group: ScanGroup, depth = 1): ScanGroup {
  if (depth > 4) throw new Error('SCAN_NESTING_LIMIT');
  if (group.conditions.length === 0 && (group.groups?.length ?? 0) === 0)
    throw new Error('SCAN_GROUP_EMPTY');
  const count = countConditions(group);
  if (count > 25) throw new Error('SCAN_CONDITION_LIMIT');
  for (const condition of group.conditions) {
    conditionSchema.parse(condition);
    if (
      condition.secondaryValue !== undefined &&
      condition.secondaryValue < condition.value
    )
      throw new Error('SCAN_RANGE_INVALID');
  }
  for (const child of group.groups ?? []) validateScanAst(child, depth + 1);
  return group;
}

export function countConditions(group: ScanGroup): number {
  return (
    group.conditions.length +
    (group.groups ?? []).reduce(
      (total, child) => total + countConditions(child),
      0,
    )
  );
}

export class IdempotentRunRequests {
  private readonly runs = new Map<string, string>();
  request(key: string, create: () => string) {
    const existing = this.runs.get(key);
    if (existing) return existing;
    const run = create();
    this.runs.set(key, run);
    return run;
  }
}

export class CursorPageLedger<T> {
  private readonly cursors = new Set<string>();
  private readonly items: T[] = [];
  add(cursor: string, values: readonly T[]) {
    if (this.cursors.has(cursor)) return this.list();
    this.cursors.add(cursor);
    this.items.push(...values);
    return this.list();
  }
  list() {
    return [...this.items];
  }
}

export type PushTarget =
  | { readonly kind: 'symbol'; readonly id: string }
  | { readonly kind: 'alert'; readonly id: string }
  | { readonly kind: 'scan-result'; readonly id: string }
  | { readonly kind: 'watchlist'; readonly id: string };

const uuid = z.uuid();
export function validatePushTarget(target: PushTarget): PushTarget {
  if (target.kind === 'symbol') {
    if (!/^[A-Z0-9._-]{1,24}$/u.test(target.id))
      throw new Error('PUSH_TARGET_INVALID');
  } else {
    if (!['alert', 'scan-result', 'watchlist'].includes(target.kind))
      throw new Error('PUSH_TARGET_INVALID');
    uuid.parse(target.id);
  }
  return target;
}

export function safePushPayload(input: {
  readonly type: 'alert' | 'scan' | 'system';
  readonly eventId: string;
  readonly target: PushTarget;
}) {
  validatePushTarget(input.target);
  uuid.parse(input.eventId);
  return {
    type: input.type,
    eventId: input.eventId,
    target: input.target,
    title: 'Atlas bildirimi',
    body: 'Ayrıntıları güvenli oturumda görüntüleyin.',
  } as const;
}

export class PushDeduplicator {
  private readonly keys = new Set<string>();
  accept(eventId: string, deviceId: string, channel: string) {
    const key = `${eventId}:${deviceId}:${channel}`;
    if (this.keys.has(key)) return false;
    this.keys.add(key);
    return true;
  }
}

export interface DeviceRegistration {
  readonly installationId: string;
  readonly tokenFingerprint: string;
  readonly userId: string;
  readonly environment: 'development' | 'production';
  readonly revokedAt: string | null;
}

export class DeviceRegistrationLedger {
  private readonly devices = new Map<string, DeviceRegistration>();
  register(value: DeviceRegistration) {
    const current = this.devices.get(value.installationId);
    if (current && current.userId !== value.userId)
      throw new Error('DEVICE_OWNERSHIP_CONFLICT');
    this.devices.set(value.installationId, value);
    return value;
  }
  rotate(userId: string, installationId: string, tokenFingerprint: string) {
    const current = this.owned(userId, installationId);
    return this.register({ ...current, tokenFingerprint, revokedAt: null });
  }
  revoke(userId: string, installationId: string, at: string) {
    const current = this.owned(userId, installationId);
    return this.register({ ...current, revokedAt: at });
  }
  private owned(userId: string, installationId: string) {
    const current = this.devices.get(installationId);
    if (!current || current.userId !== userId)
      throw new Error('DEVICE_ACCESS_DENIED');
    return current;
  }
}

export function isQuietHour(input: {
  readonly minute: number;
  readonly start: number;
  readonly end: number;
  readonly security: boolean;
}) {
  if (input.security) return false;
  if (input.start === input.end) throw new Error('QUIET_HOURS_INVALID');
  return input.start < input.end
    ? input.minute >= input.start && input.minute < input.end
    : input.minute >= input.start || input.minute < input.end;
}

export function redactOperationsTelemetry(
  event: string,
  values: Readonly<Record<string, unknown>>,
) {
  const forbidden =
    /token|user|symbol|watchlist|threshold|ast|payload|credential|device|query/iu;
  return {
    event,
    attributes: Object.fromEntries(
      Object.entries(values).filter(([key]) => !forbidden.test(key)),
    ),
  };
}

export function mutationAllowed(online: boolean) {
  if (!online) throw new Error('OFFLINE_MUTATION_BLOCKED');
  return true;
}
