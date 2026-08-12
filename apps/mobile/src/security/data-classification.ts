export type MobileDataClass =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'USER_PRIVATE'
  | 'FINANCIAL_SENSITIVE'
  | 'AUTH_SECRET'
  | 'DEVICE_SECRET'
  | 'TEMPORARY_SENSITIVE'
  | 'DEMO_TEST_ONLY';

export interface DataHandlingPolicy {
  readonly persistence:
    | 'allowed'
    | 'protected-only'
    | 'memory-only'
    | 'test-only';
  readonly telemetry: 'aggregate-only' | 'prohibited';
  readonly clipboard: 'explicit' | 'prohibited';
  readonly share: 'explicit' | 'prohibited';
  readonly appSwitcherMask: boolean;
  readonly logoutCleanup: boolean;
  readonly maxRetentionMs: number | null;
}

export const MOBILE_DATA_POLICIES: Readonly<
  Record<MobileDataClass, DataHandlingPolicy>
> = {
  PUBLIC: {
    persistence: 'allowed',
    telemetry: 'aggregate-only',
    clipboard: 'explicit',
    share: 'explicit',
    appSwitcherMask: false,
    logoutCleanup: false,
    maxRetentionMs: 30 * 24 * 60 * 60_000,
  },
  INTERNAL: {
    persistence: 'memory-only',
    telemetry: 'aggregate-only',
    clipboard: 'prohibited',
    share: 'prohibited',
    appSwitcherMask: true,
    logoutCleanup: true,
    maxRetentionMs: 24 * 60 * 60_000,
  },
  USER_PRIVATE: {
    persistence: 'memory-only',
    telemetry: 'prohibited',
    clipboard: 'explicit',
    share: 'explicit',
    appSwitcherMask: true,
    logoutCleanup: true,
    maxRetentionMs: 15 * 60_000,
  },
  FINANCIAL_SENSITIVE: {
    persistence: 'memory-only',
    telemetry: 'prohibited',
    clipboard: 'prohibited',
    share: 'explicit',
    appSwitcherMask: true,
    logoutCleanup: true,
    maxRetentionMs: 5 * 60_000,
  },
  AUTH_SECRET: {
    persistence: 'protected-only',
    telemetry: 'prohibited',
    clipboard: 'prohibited',
    share: 'prohibited',
    appSwitcherMask: true,
    logoutCleanup: true,
    maxRetentionMs: null,
  },
  DEVICE_SECRET: {
    persistence: 'protected-only',
    telemetry: 'prohibited',
    clipboard: 'prohibited',
    share: 'prohibited',
    appSwitcherMask: true,
    logoutCleanup: true,
    maxRetentionMs: null,
  },
  TEMPORARY_SENSITIVE: {
    persistence: 'protected-only',
    telemetry: 'prohibited',
    clipboard: 'prohibited',
    share: 'explicit',
    appSwitcherMask: true,
    logoutCleanup: true,
    maxRetentionMs: 15 * 60_000,
  },
  DEMO_TEST_ONLY: {
    persistence: 'test-only',
    telemetry: 'prohibited',
    clipboard: 'prohibited',
    share: 'prohibited',
    appSwitcherMask: false,
    logoutCleanup: true,
    maxRetentionMs: 24 * 60 * 60_000,
  },
};

export function canPersistBulkData(classification: MobileDataClass): boolean {
  return MOBILE_DATA_POLICIES[classification].persistence === 'allowed';
}
