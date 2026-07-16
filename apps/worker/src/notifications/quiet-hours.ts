import type { NotificationPreference } from './contracts';

export function resolveEmailAvailableAt(
  now: Date,
  preference: NotificationPreference,
): Date {
  if (
    !preference.quietHoursEnabled ||
    preference.quietHoursStartMinute === null ||
    preference.quietHoursEndMinute === null ||
    preference.quietHoursStartMinute === preference.quietHoursEndMinute
  ) {
    return new Date(now);
  }
  const timezone = validTimezone(preference.timezone)
    ? preference.timezone
    : 'UTC';
  if (
    !isQuiet(
      localMinute(now, timezone),
      preference.quietHoursStartMinute,
      preference.quietHoursEndMinute,
    )
  ) {
    return new Date(now);
  }
  const start = Math.floor(now.getTime() / 60_000) * 60_000;
  for (let offset = 1; offset <= 3_000; offset += 1) {
    const candidate = new Date(start + offset * 60_000);
    if (
      !isQuiet(
        localMinute(candidate, timezone),
        preference.quietHoursStartMinute,
        preference.quietHoursEndMinute,
      )
    ) {
      return candidate;
    }
  }
  throw new Error('Quiet-hours window could not be resolved');
}

export function isQuiet(
  localMinuteValue: number,
  startMinute: number,
  endMinute: number,
): boolean {
  if (startMinute === endMinute) return false;
  return startMinute < endMinute
    ? localMinuteValue >= startMinute && localMinuteValue < endMinute
    : localMinuteValue >= startMinute || localMinuteValue < endMinute;
}

function localMinute(value: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const hour = Number(parts.find(({ type }) => type === 'hour')?.value ?? 0);
  const minute = Number(
    parts.find(({ type }) => type === 'minute')?.value ?? 0,
  );
  return hour * 60 + minute;
}

function validTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}
