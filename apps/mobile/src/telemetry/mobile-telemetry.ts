import { NoopTelemetry, type Telemetry } from '@atlas/telemetry';

export interface CrashAdapter {
  capture(error: unknown, context: Readonly<Record<string, unknown>>): void;
}

export interface MobileTelemetryComposition {
  readonly crash: CrashAdapter;
  readonly telemetry: Telemetry;
  readonly productionConfigured: boolean;
}

export function createTelemetryFoundation(): MobileTelemetryComposition {
  return {
    crash: { capture: () => undefined },
    telemetry: new NoopTelemetry(),
    productionConfigured: false,
  };
}
