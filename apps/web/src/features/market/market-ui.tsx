import clsx from 'clsx';
import type { ReactNode } from 'react';

import type { MarketMeta } from './types';

export function FreshnessBanner({ meta }: { readonly meta: MarketMeta }) {
  const state = meta.stale ? 'stale' : meta.partial ? 'partial' : 'complete';
  return (
    <div className={clsx('intelligence-freshness', state)} role="status">
      <strong>
        {state === 'stale'
          ? 'Gecikmiş veri'
          : state === 'partial'
            ? 'Kısmi piyasa görünümü'
            : 'Veri güncel'}
      </strong>
      <span>
        Kesim {formatDateTime(meta.dataCutoffAt)}
        {meta.excludedCount ? ` · ${meta.excludedCount} sembol hariç` : ''}
      </span>
    </div>
  );
}

export function MarketState({
  kind,
  children,
}: {
  readonly kind: 'loading' | 'error' | 'empty';
  readonly children: ReactNode;
}) {
  return (
    <div
      className={clsx('intelligence-state', kind)}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      <span aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

export function DirectionValue({
  value,
  suffix = '%',
}: {
  readonly value: string | null | undefined;
  readonly suffix?: string;
}) {
  const numeric = value === null || value === undefined ? null : Number(value);
  if (numeric === null || !Number.isFinite(numeric)) return <>Veri yok</>;
  const direction = numeric > 0 ? 'Yükseliş' : numeric < 0 ? 'Düşüş' : 'Yatay';
  return (
    <span
      className={clsx(numeric > 0 && 'positive', numeric < 0 && 'negative')}
    >
      <span className="direction-word">{direction}</span>{' '}
      {numeric > 0 ? '+' : ''}
      {numeric.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
      {suffix}
    </span>
  );
}

export function formatNumber(
  value: string | number | null | undefined,
  maximumFractionDigits = 2,
) {
  if (value === null || value === undefined || !Number.isFinite(Number(value)))
    return 'Veri yok';
  return Number(value).toLocaleString('tr-TR', { maximumFractionDigits });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Veri yok';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Veri yok'
    : new Intl.DateTimeFormat('tr-TR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
}

export function humanCode(code: string) {
  const labels: Readonly<Record<string, string>> = {
    pe: 'F/K',
    pb: 'PD/DD',
    evEbitda: 'FD/FAVÖK',
    netDebtEbitda: 'Net borç/FAVÖK',
    grossMargin: 'Brüt marj',
    operatingMargin: 'Faaliyet marjı',
    netMargin: 'Net marj',
    roa: 'Aktif kârlılığı',
    roe: 'Özsermaye kârlılığı',
    currentRatio: 'Cari oran',
    debtToEquity: 'Borç/özsermaye',
    freeCashFlowMargin: 'Serbest nakit akışı marjı',
    revenueGrowth: 'Ciro büyümesi',
    netIncomeGrowth: 'Net kâr büyümesi',
    revenue: 'Hasılat',
    grossProfit: 'Brüt kâr',
    operatingProfit: 'Faaliyet kârı',
    ebitda: 'FAVÖK',
    netIncome: 'Net kâr',
    equity: 'Özsermaye',
  };
  return labels[code] ?? code.replaceAll('_', ' ');
}
