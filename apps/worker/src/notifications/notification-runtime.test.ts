import { describe, expect, it } from 'vitest';

import type { NotificationPreference } from './contracts';
import { EmailDeliveryError, FakeEmailAdapter } from './email-adapter';
import { isQuiet, resolveEmailAvailableAt } from './quiet-hours';

const preference: NotificationPreference = {
  userId: 'user-1',
  timezone: 'Europe/Istanbul',
  locale: 'tr-TR',
  emailAlertsEnabled: true,
  quietHoursEnabled: true,
  quietHoursStartMinute: 22 * 60,
  quietHoursEndMinute: 7 * 60,
  throttleMinutes: 0,
};

describe('quiet hours', () => {
  it('handles an overnight window in the user timezone', () => {
    const now = new Date('2026-07-15T20:30:00.000Z');
    expect(resolveEmailAvailableAt(now, preference).toISOString()).toBe(
      '2026-07-16T04:00:00.000Z',
    );
    expect(isQuiet(23 * 60, 22 * 60, 7 * 60)).toBe(true);
    expect(isQuiet(12 * 60, 22 * 60, 7 * 60)).toBe(false);
  });

  it('does not defer outside quiet hours', () => {
    const now = new Date('2026-07-15T12:00:00.000Z');
    expect(resolveEmailAvailableAt(now, preference)).toEqual(now);
  });
});

describe('fake e-mail adapter', () => {
  const request = {
    recipient: 'investor@example.test',
    idempotencyKey: 'delivery-1',
    templateCode: 'alert-triggered',
    templateVersion: 1,
    locale: 'tr-TR',
    variables: { title: 'Alert' },
  };

  it('classifies temporary failures and remains idempotent after retry', async () => {
    const adapter = new FakeEmailAdapter();
    adapter.failNext('EMAIL_TIMEOUT');
    await expect(adapter.send(request)).rejects.toMatchObject({
      code: 'EMAIL_TIMEOUT',
      retryable: true,
    });
    const sent = await adapter.send(request);
    expect(await adapter.send(request)).toEqual(sent);
    expect(adapter.sent).toHaveLength(1);
  });

  it('classifies invalid recipients as permanent', () => {
    expect(new EmailDeliveryError('EMAIL_INVALID_RECIPIENT')).toMatchObject({
      retryable: false,
    });
  });
});
