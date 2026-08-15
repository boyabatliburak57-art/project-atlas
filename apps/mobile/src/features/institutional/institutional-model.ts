import type { InstitutionalFlowRow, SettlementRow } from './institutional-api';

export const moneyFlowMethodology =
  'Net Kurumsal Akış, seçilen dönemde kapsanan kurumların alış ve satış tutarları arasındaki farktır; yatırım tavsiyesi değildir.';

export function flowDirection(value: string | null) {
  if (value === null) return { label: 'Değerlendirilemiyor', sign: '—' };
  const numeric = Number(value);
  return numeric > 0
    ? { label: 'Net Alım', sign: '+' }
    : numeric < 0
      ? { label: 'Net Satım', sign: '−' }
      : { label: 'Dengeli', sign: '±' };
}
export function formatCompactTry(value: string | null) {
  if (value === null) return '—';
  const numeric = Number(value);
  const absolute = Math.abs(numeric);
  const scale =
    absolute >= 1_000_000_000
      ? 1_000_000_000
      : absolute >= 1_000_000
        ? 1_000_000
        : 1;
  const suffix =
    scale === 1_000_000_000 ? ' mr' : scale === 1_000_000 ? ' mn' : '';
  const sign = numeric > 0 ? '+' : numeric < 0 ? '−' : '';
  return `${sign}₺${(absolute / scale).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}${suffix}`;
}
export function flowAccessibility(row: InstitutionalFlowRow) {
  const direction = flowDirection(row.netValue);
  return `${row.institutionName}, ${direction.label}, ${formatCompactTry(row.netValue)}, işlem tarihi ${row.tradeDate}`;
}
export function settlementAccessibility(row: SettlementRow) {
  const ratio =
    row.holdingRatio === null
      ? 'oran yok'
      : `pay yüzde ${(Number(row.holdingRatio) * 100).toLocaleString('tr-TR')}`;
  return `${row.institutionName}, ${ratio}, takas tarihi ${row.settlementDate}`;
}
export function isForeignAvailable(rows: readonly SettlementRow[]) {
  return rows.some((row) => row.residency !== 'UNKNOWN');
}
