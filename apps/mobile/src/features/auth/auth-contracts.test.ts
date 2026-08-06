import { describe, expect, it } from 'vitest';
import {
  loginSchema,
  normalizeEmail,
  resetPasswordSchema,
  safeAuthMessage,
  SubmitGate,
} from './auth-contracts';

describe('mobile auth contracts', () => {
  it('normalizes email without changing passwords', () =>
    expect(normalizeEmail(' User@Example.COM ')).toBe('user@example.com'));
  it('validates login email', () =>
    expect(loginSchema.safeParse({ email: 'bad', password: 'x' }).success).toBe(
      false,
    ));
  it('accepts a non-trimmed password', () =>
    expect(
      loginSchema.safeParse({ email: 'a@b.co', password: '  secret  ' })
        .success,
    ).toBe(true));
  it('rejects an empty password', () =>
    expect(
      loginSchema.safeParse({ email: 'a@b.co', password: '' }).success,
    ).toBe(false));
  it('enforces authoritative minimum reset length contract', () =>
    expect(
      resetPasswordSchema.safeParse({
        password: 'short',
        confirmation: 'short',
      }).success,
    ).toBe(false));
  it('rejects reset confirmation mismatch', () =>
    expect(
      resetPasswordSchema.safeParse({
        password: 'LongPassword1!',
        confirmation: 'LongPassword2!',
      }).success,
    ).toBe(false));
  it('maps invalid credentials safely', () =>
    expect(safeAuthMessage('INVALID_CREDENTIALS')).not.toContain('user'));
  it('maps rate limits', () =>
    expect(safeAuthMessage('RATE_LIMITED')).toContain('fazla'));
  it('does not expose unknown backend messages', () =>
    expect(safeAuthMessage('SQL_ERROR password=secret')).toBe(
      'İşlem güvenli şekilde tamamlanamadı.',
    ));
  it('prevents duplicate submit', async () => {
    const gate = new SubmitGate();
    let resolve!: (value: number) => void;
    const first = gate.run(
      () =>
        new Promise<number>((done) => {
          resolve = done;
        }),
    );
    await expect(gate.run(() => Promise.resolve(2))).resolves.toBeUndefined();
    resolve(1);
    await expect(first).resolves.toBe(1);
  });
});
