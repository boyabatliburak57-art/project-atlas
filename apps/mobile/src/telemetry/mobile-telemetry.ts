import { NoopTelemetry, type Telemetry } from '@atlas/telemetry';
import { redactSensitive } from '../security/redaction';

export interface CrashAdapter {
  capture(error: unknown, context: Readonly<Record<string, unknown>>): void;
}

export interface MobileTelemetryComposition {
  readonly crash: CrashAdapter;
  readonly telemetry: Telemetry;
  readonly productionConfigured: boolean;
}

export function createTelemetryFoundation(): MobileTelemetryComposition {
  const sink: CrashAdapter = { capture: () => undefined };
  return {
    crash: {
      capture(error, context) {
        sink.capture(
          redactSensitive(error),
          redactSensitive(context) as Readonly<Record<string, unknown>>,
        );
      },
    },
    telemetry: new NoopTelemetry(),
    productionConfigured: false,
  };
}
