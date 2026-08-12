const sensitiveKey =
  /(?:authorization|password|passcode|token|secret|session|cookie|signed.?url|portfolio.?value|transaction.?amount|support.?(?:subject|description)|strategy.?ast|provider.?payload)/iu;
const bearer = /Bearer\s+[-/A-Za-z0-9._~+]+=*/giu;
const tokenQuery = /([?&](?:token|code|signature|sig|key)=)[^&#]*/giu;

export const REDACTED = '[REDACTED]';

export function redactSensitive(value: unknown, depth = 0): unknown {
  if (depth > 8) return REDACTED;
  if (typeof value === 'string')
    return value.replace(bearer, REDACTED).replace(tokenQuery, `$1${REDACTED}`);
  if (Array.isArray(value))
    return value.map((item) => redactSensitive(item, depth + 1));
  if (typeof value !== 'object' || value === null) return value;
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    output[key] = sensitiveKey.test(key)
      ? REDACTED
      : redactSensitive(item, depth + 1);
  }
  return output;
}

export interface SafeLoggerSink {
  write(event: Readonly<Record<string, unknown>>): void;
}
export class RedactingLogger {
  constructor(private readonly sink: SafeLoggerSink) {}
  write(event: Readonly<Record<string, unknown>>): void {
    this.sink.write(
      redactSensitive(event) as Readonly<Record<string, unknown>>,
    );
  }
}
