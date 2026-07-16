'use client';

import { useQuery } from '@tanstack/react-query';

import { AtlasShell, WorkspaceState } from './atlas-shell';
import { portfolioApi } from './api';
import {
  errorMessage,
  formatDateTime,
  formatMoney,
  formatPercent,
  humanReason,
  Metric,
  metricValue,
  PortfolioSubnav,
} from './portfolio-ui';

export function PortfolioPerformanceWorkspace({
  portfolioId,
}: {
  readonly portfolioId: string;
}) {
  const portfolio = useQuery({
    queryKey: ['portfolios', portfolioId],
    queryFn: () => portfolioApi.portfolio(portfolioId),
    retry: false,
  });
  const performance = useQuery({
    queryKey: ['portfolios', portfolioId, 'performance'],
    queryFn: () => portfolioApi.performance(portfolioId),
    retry: false,
  });
  if (portfolio.isError)
    return <ErrorShell>{errorMessage(portfolio.error)}</ErrorShell>;
  const data = performance.data;
  const drawdown = data ? drawdownSeries(data.dailyValueSeries) : [];
  const benchmarkReturn = data?.benchmark.priceReturn;
  const difference =
    data?.twr.status === 'complete' &&
    benchmarkReturn !== null &&
    benchmarkReturn !== undefined
      ? String(Number(data.twr.value) - Number(benchmarkReturn))
      : null;
  return (
    <AtlasShell>
      <main className="portfolio-main analytics-main">
        <header className="portfolio-page-header compact-heading">
          <div>
            <p className="rail-label">Getiri analizi</p>
            <h1>{portfolio.data?.name ?? 'Performans'}</h1>
            <p>
              Dış nakit akışları ayrıştırılarak portföy ve benchmark aynı cutoff
              ile karşılaştırılır.
            </p>
          </div>
        </header>
        <PortfolioSubnav portfolioId={portfolioId} />
        {performance.isLoading && (
          <WorkspaceState kind="loading">Performans yükleniyor.</WorkspaceState>
        )}
        {performance.isError && (
          <WorkspaceState kind="error">
            {errorMessage(performance.error)}
          </WorkspaceState>
        )}
        {data && (
          <>
            {data.status !== 'complete' && (
              <div className="data-warning" role="status">
                <strong>Performans kısmen hesaplandı</strong>
                <p>
                  {data.warnings.join(', ') ||
                    'Bazı metrikler için yeterli gözlem bulunmuyor.'}
                </p>
              </div>
            )}
            <dl className="portfolio-metric-grid performance-metrics">
              <Metric
                label="TWR"
                value={metricValue(data.twr)}
                supporting="Dış nakit akışından arındırılmış"
              />
              <Metric
                label="XIRR"
                value={metricValue(data.xirr)}
                supporting={
                  data.xirr.status === 'notEvaluable'
                    ? humanReason(data.xirr.reason)
                    : 'Para ağırlıklı getiri'
                }
              />
              <Metric
                label={data.benchmarkCode}
                value={formatPercent(data.benchmark.priceReturn)}
                supporting="Benchmark fiyat getirisi"
              />
              <Metric
                label="Benchmark farkı"
                value={formatPercent(difference)}
              />
            </dl>
            <section
              className="analytics-series-grid"
              aria-label="Performans serileri"
            >
              <AccessibleSeries
                title="Portföy değeri"
                points={data.dailyValueSeries.map((point) => ({
                  date: point.date,
                  value: Number(point.value),
                }))}
                formatter={formatMoney}
              />
              <AccessibleSeries
                title="Net katkı"
                points={data.netContributionSeries.map((point) => ({
                  date: point.date,
                  value: Number(point.value),
                }))}
                formatter={formatMoney}
              />
              <AccessibleSeries
                title="Düşüş serisi"
                points={drawdown}
                formatter={formatPercent}
              />
            </section>
            <section
              className="methodology-note"
              aria-labelledby="performance-methodology"
            >
              <h2 id="performance-methodology">Metodoloji</h2>
              <p>
                TWR nakit akışlarının etkisini alt dönemlere ayırır. XIRR
                düzensiz nakit akışlarını ve tarihlerini birlikte değerlendirir.
                Sonuçlar vergi veya yatırım tavsiyesi değildir.
              </p>
              <dl className="methodology-values">
                <div>
                  <dt>Metodoloji sürümü</dt>
                  <dd>{data.performancePolicyVersion}</dd>
                </div>
                <div>
                  <dt>Aralık</dt>
                  <dd>
                    {formatDateTime(data.rangeStartAt)} -{' '}
                    {formatDateTime(data.rangeEndAt)}
                  </dd>
                </div>
                <div>
                  <dt>Data cutoff</dt>
                  <dd>{formatDateTime(data.dataCutoffAt)}</dd>
                </div>
              </dl>
            </section>
          </>
        )}
      </main>
    </AtlasShell>
  );
}

function AccessibleSeries({
  title,
  points,
  formatter,
}: {
  readonly title: string;
  readonly points: readonly { date: string; value: number }[];
  readonly formatter: (value: string) => string;
}) {
  const valid = points.filter((point) => Number.isFinite(point.value));
  if (valid.length === 0)
    return (
      <section className="series-panel">
        <h2>{title}</h2>
        <WorkspaceState kind="empty">Seri verisi bulunmuyor.</WorkspaceState>
      </section>
    );
  const values = valid.map((point) => point.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum || 1;
  const coordinates = valid
    .map((point, index) => {
      const x = valid.length === 1 ? 50 : (index / (valid.length - 1)) * 100;
      const y = 48 - ((point.value - minimum) / range) * 44;
      return `${x},${y}`;
    })
    .join(' ');
  const first = valid[0]!;
  const last = valid.at(-1)!;
  const description = `${valid.length} gözlem. Başlangıç ${first.date}: ${formatter(String(first.value))}. Bitiş ${last.date}: ${formatter(String(last.value))}. En düşük ${formatter(String(minimum))}. En yüksek ${formatter(String(maximum))}.`;
  const id = `series-${title.toLocaleLowerCase('tr-TR').replaceAll(' ', '-')}`;
  return (
    <figure className="series-panel">
      <figcaption>
        <h2>{title}</h2>
        <p>{description}</p>
      </figcaption>
      <svg
        viewBox="0 0 100 52"
        role="img"
        aria-labelledby={`${id}-title ${id}-desc`}
        preserveAspectRatio="none"
      >
        <title id={`${id}-title`}>{title} grafiği</title>
        <desc id={`${id}-desc`}>{description}</desc>
        <polyline
          points={coordinates}
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </figure>
  );
}

function drawdownSeries(
  series: readonly { readonly date: string; readonly value: string }[],
) {
  let peak = Number.NEGATIVE_INFINITY;
  return series.map((point) => {
    const value = Number(point.value);
    peak = Math.max(peak, value);
    return { date: point.date, value: peak > 0 ? value / peak - 1 : 0 };
  });
}

function ErrorShell({ children }: { readonly children: React.ReactNode }) {
  return (
    <AtlasShell>
      <main className="portfolio-main">
        <WorkspaceState kind="error">{children}</WorkspaceState>
      </main>
    </AtlasShell>
  );
}
