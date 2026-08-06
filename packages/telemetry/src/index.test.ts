import { describe, expect, it } from 'vitest';
import { LocalSafeTelemetry, redactTelemetry } from './index';

describe('telemetry', () => {
  it('redacts secrets and sensitive financial values', () => {
    expect(
      redactTelemetry({
        authorization: 'Bearer secret',
        portfolioValue: 100,
        route: 'home',
      }),
    ).toEqual({
      authorization: '[REDACTED]',
      portfolioValue: '[REDACTED]',
      route: 'home',
    });
  });

  it('executes a span operation once', async () => {
    let calls = 0;
    const telemetry = new LocalSafeTelemetry(() => undefined);
    await telemetry.span('test', () => Promise.resolve(++calls));
    expect(calls).toBe(1);
  });
});
