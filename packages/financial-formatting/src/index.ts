export type FinancialInput = number | null | undefined;
const valid = (value: FinancialInput): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const normalized = (value: number) => (Object.is(value, -0) ? 0 : value);
export function formatTry(value: FinancialInput, locale = 'tr-TR'): string {
  return valid(value)
    ? new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(normalized(value))
    : '—';
}
export function formatPercent(value: FinancialInput, locale = 'tr-TR'): string {
  return valid(value)
    ? new Intl.NumberFormat(locale, {
        style: 'percent',
        signDisplay: normalized(value) === 0 ? 'never' : 'always',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(normalized(value))
    : '—';
}
export function formatCompact(value: FinancialInput, locale = 'tr-TR'): string {
  return valid(value)
    ? new Intl.NumberFormat(locale, {
        notation: 'compact',
        maximumFractionDigits: 2,
      }).format(normalized(value))
    : '—';
}
export function formatSigned(value: FinancialInput, locale = 'tr-TR'): string {
  return valid(value)
    ? new Intl.NumberFormat(locale, {
        signDisplay: normalized(value) === 0 ? 'never' : 'always',
        maximumFractionDigits: 2,
      }).format(normalized(value))
    : '—';
}
export function formatMarketTimestamp(
  value: Date | null | undefined,
  locale = 'tr-TR',
): string {
  return value instanceof Date && Number.isFinite(value.getTime())
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Europe/Istanbul',
      }).format(value)
    : '—';
}
