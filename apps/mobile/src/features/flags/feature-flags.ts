export const mobileCapabilityKeys = [
  'mobileHome',
  'mobileMarkets',
  'mobileSearch',
  'mobileScanner',
  'mobileAlerts',
  'mobilePortfolio',
  'mobileStrategyLab',
  'mobileReports',
  'mobilePush',
  'mobileOfflineCache',
  'fundamentals',
  'corporateActions',
  'newsInsights',
  'realTimeData',
] as const;

export type MobileCapabilityKey = (typeof mobileCapabilityKeys)[number];

export interface CapabilityState {
  readonly enabled: boolean;
  readonly reasonCode: string;
  readonly version: number;
}

export type CapabilitySnapshot = Readonly<
  Record<MobileCapabilityKey, CapabilityState>
>;

export function safeCapabilityDefaults(): CapabilitySnapshot {
  return Object.fromEntries(
    mobileCapabilityKeys.map((key) => [
      key,
      { enabled: false, reasonCode: 'BOOTSTRAP_REQUIRED', version: 0 },
    ]),
  ) as unknown as CapabilitySnapshot;
}

export class FeatureFlagController {
  private snapshot = safeCapabilityDefaults();

  current(): CapabilitySnapshot {
    return this.snapshot;
  }

  bootstrap(input: Partial<CapabilitySnapshot>): CapabilitySnapshot {
    this.snapshot = Object.fromEntries(
      mobileCapabilityKeys.map((key) => {
        const value = input[key];
        return [
          key,
          value === undefined
            ? this.snapshot[key]
            : {
                enabled: value.enabled,
                reasonCode: value.reasonCode,
                version: value.version,
              },
        ];
      }),
    ) as unknown as CapabilitySnapshot;
    return this.snapshot;
  }
}
