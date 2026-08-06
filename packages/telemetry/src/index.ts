export type TelemetryEvent =
  | 'app.startup'
  | 'route.transition'
  | 'api.request'
  | 'error.handled'
  | 'error.unhandled'
  | 'network.changed';

export interface TelemetryContext {
  readonly appVersion: string;
  readonly environment: string;
  readonly platform: string;
}

export interface Telemetry {
  event(name: TelemetryEvent, fields?: Readonly<Record<string, unknown>>): void;
  span<T>(name: string, operation: () => Promise<T>): Promise<T>;
}

const sensitive =
  /(authorization|cookie|password|token|secret|credential|portfolio.?value|transaction|personal|email|raw.?payload|search.?query)/iu;

export function redactTelemetry(
  fields: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      sensitive.test(key) ? '[REDACTED]' : value,
    ]),
  );
}

export class NoopTelemetry implements Telemetry {
  event(
    _name: TelemetryEvent,
    _fields: Readonly<Record<string, unknown>> = {},
  ): void {
    void _name;
    void _fields;
  }

  async span<T>(_name: string, operation: () => Promise<T>): Promise<T> {
    return operation();
  }
}

export class LocalSafeTelemetry implements Telemetry {
  constructor(
    private readonly sink: (event: {
      readonly name: string;
      readonly fields: Readonly<Record<string, unknown>>;
    }) => void,
  ) {}

  event(
    name: TelemetryEvent,
    fields: Readonly<Record<string, unknown>> = {},
  ): void {
    this.sink({ name, fields: redactTelemetry(fields) });
  }

  async span<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const startedAt = Date.now();
    try {
      return await operation();
    } finally {
      this.event('api.request', {
        operation: name,
        durationMs: Date.now() - startedAt,
      });
    }
  }
}
