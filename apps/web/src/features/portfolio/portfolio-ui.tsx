'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { PortfolioApiError } from './api';
import type { PerformanceMetric, PortfolioValuation } from './types';

export function PortfolioSubnav({
  portfolioId,
}: {
  readonly portfolioId: string;
}) {
  const pathname = usePathname();
  const items = [
    { href: `/portfolios/${portfolioId}`, label: 'Özet' },
    { href: `/portfolios/${portfolioId}/transactions`, label: 'İşlemler' },
    { href: `/portfolios/${portfolioId}/performance`, label: 'Performans' },
    { href: `/portfolios/${portfolioId}/risk`, label: 'Risk' },
    { href: `/portfolios/${portfolioId}/import`, label: 'CSV içe aktar' },
  ];
  return (
    <nav className="portfolio-subnav" aria-label="Portföy bölümleri">
      {items.map((item) => (
        <Link
          key={item.href}
          className={clsx(pathname === item.href && 'active')}
          href={item.href}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function DataWarning({
  valuation,
}: {
  readonly valuation: PortfolioValuation;
}) {
  if (valuation.status === 'complete') return null;
  return (
    <div className="data-warning" role="status">
      <strong>
        {valuation.status === 'partial'
          ? 'Kısmi değerleme'
          : 'Değerleme hesaplanamadı'}
      </strong>
      <p>
        {valuation.missingPriceCount > 0
          ? `${valuation.missingPriceCount} pozisyon için fiyat bulunamadı. Eksik fiyatlar sıfır kabul edilmedi.`
          : 'Bazı fiyatlar güncel değil. Sonuçları veri zamanıyla birlikte değerlendirin.'}
      </p>
    </div>
  );
}

export function Metric({
  label,
  value,
  supporting,
  tone,
}: {
  readonly label: string;
  readonly value: ReactNode;
  readonly supporting?: ReactNode | undefined;
  readonly tone?: 'positive' | 'negative' | 'warning' | undefined;
}) {
  return (
    <div className="portfolio-metric">
      <dt>{label}</dt>
      <dd className={tone}>{value}</dd>
      {supporting && <small>{supporting}</small>}
    </div>
  );
}

export function metricValue(metric: PerformanceMetric | undefined) {
  return metric?.status === 'complete'
    ? formatPercent(metric.value)
    : `Hesaplanamadı${metric?.reason ? `: ${humanReason(metric.reason)}` : ''}`;
}

export function formatMoney(value: string | null | undefined) {
  if (value === null || value === undefined) return 'Veri yok';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 'Veri yok';
  return `${parsed.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₺`;
}

export function formatSignedMoney(value: string | null | undefined) {
  const formatted = formatMoney(value);
  return value !== null && value !== undefined && Number(value) > 0
    ? `+${formatted}`
    : formatted;
}

export function formatDecimal(value: string | null | undefined, digits = 4) {
  if (value === null || value === undefined) return 'Veri yok';
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed.toLocaleString('tr-TR', { maximumFractionDigits: digits })
    : 'Veri yok';
}

export function formatPercent(value: string | null | undefined) {
  if (value === null || value === undefined) return 'Veri yok';
  const parsed = Number(value) * (Math.abs(Number(value)) <= 2 ? 100 : 1);
  if (!Number.isFinite(parsed)) return 'Veri yok';
  return `${parsed > 0 ? '+' : ''}${parsed.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
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

export function signedTone(value: string | null | undefined) {
  const number = Number(value);
  return !Number.isFinite(number) || number === 0
    ? undefined
    : number > 0
      ? ('positive' as const)
      : ('negative' as const);
}

export function humanReason(reason: string | null | undefined) {
  const labels: Readonly<Record<string, string>> = {
    INSUFFICIENT_OBSERVATIONS: 'yetersiz gözlem',
    ZERO_BENCHMARK_VARIANCE: 'benchmark değişkenliği yok',
    ZERO_SERIES_VARIANCE: 'seri değişkenliği yok',
    NO_DOWNSIDE_OBSERVATIONS: 'aşağı yönlü gözlem yok',
    NON_POSITIVE_VALUE: 'pozitif portföy değeri yok',
    STALE_INPUT: 'girdi verisi gecikmiş',
    NO_SOLUTION: 'çözüm bulunamadı',
    MAXIMUM_ITERATIONS: 'hesaplama yakınsamadı',
  };
  return reason
    ? (labels[reason] ?? reason.toLocaleLowerCase('tr-TR'))
    : 'bilinmiyor';
}

export function errorMessage(error: unknown) {
  const code = error instanceof PortfolioApiError ? error.code : String(error);
  const messages: Readonly<Record<string, string>> = {
    PORTFOLIO_ACCESS_DENIED: 'Bu portföye erişim yetkiniz yok.',
    PORTFOLIO_IMPORT_ACCESS_DENIED: 'Bu içe aktarma işine erişim yetkiniz yok.',
    PORTFOLIO_INSUFFICIENT_POSITION: 'Satış miktarı mevcut pozisyonu aşıyor.',
    PORTFOLIO_IDEMPOTENCY_CONFLICT:
      'Aynı işlem anahtarı farklı içerikle kullanıldı.',
    PORTFOLIO_DELETED: 'Silinmiş portföye yeni işlem eklenemez.',
    PORTFOLIO_INVALID: 'Alanları kontrol edin. İşlem doğrulanamadı.',
    PORTFOLIO_CSV_INVALID: 'CSV doğrulanamadı. Satır hatalarını kontrol edin.',
    PORTFOLIO_IMPORT_ATOMIC_VALIDATION_FAILED:
      'Atomic modda tüm satırlar geçerli olmalıdır.',
  };
  return messages[code] ?? `İşlem tamamlanamadı: ${code}`;
}

export function idempotencyKey(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
