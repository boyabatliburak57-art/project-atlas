'use client';

import { useQuery } from '@tanstack/react-query';

import { AtlasShell, WorkspaceState } from './atlas-shell';
import { portfolioApi } from './api';
import {
  errorMessage,
  formatDateTime,
  formatPercent,
  humanReason,
  PortfolioSubnav,
} from './portfolio-ui';
import type { RiskMetric } from './types';

export function PortfolioRiskWorkspace({
  portfolioId,
}: {
  readonly portfolioId: string;
}) {
  const portfolio = useQuery({
    queryKey: ['portfolios', portfolioId],
    queryFn: () => portfolioApi.portfolio(portfolioId),
    retry: false,
  });
  const risk = useQuery({
    queryKey: ['portfolios', portfolioId, 'risk'],
    queryFn: () => portfolioApi.risk(portfolioId),
    retry: false,
  });
  if (portfolio.isError)
    return (
      <AtlasShell>
        <main className="portfolio-main">
          <WorkspaceState kind="error">
            {errorMessage(portfolio.error)}
          </WorkspaceState>
        </main>
      </AtlasShell>
    );
  const data = risk.data;
  return (
    <AtlasShell>
      <main className="portfolio-main analytics-main">
        <header className="portfolio-page-header compact-heading">
          <div>
            <p className="rail-label">Tarihsel risk görünümü</p>
            <h1>{portfolio.data?.name ?? 'Risk'}</h1>
            <p>
              Risk metrikleri geçmiş veriyi açık metodoloji ve gözlem sayısıyla
              özetler.
            </p>
          </div>
        </header>
        <PortfolioSubnav portfolioId={portfolioId} />
        <div className="risk-disclaimer" role="note">
          Bu ekran yatırım tavsiyesi değildir. Historical VaR gelecekteki kaybı
          tahmin veya garanti etmez.
        </div>
        {risk.isLoading && (
          <WorkspaceState kind="loading">
            Risk metrikleri yükleniyor.
          </WorkspaceState>
        )}
        {risk.isError && (
          <WorkspaceState kind="error">
            {errorMessage(risk.error)}
          </WorkspaceState>
        )}
        {data && (
          <>
            <section className="risk-metric-grid" aria-label="Risk metrikleri">
              <RiskMetricCard
                label="Volatilite"
                metric={data.volatility}
                format="percent"
              />
              <RiskMetricCard label="Beta" metric={data.beta} />
              <RiskMetricCard label="Korelasyon" metric={data.correlation} />
              <RiskMetricCard
                label="Maksimum düşüş"
                metric={drawdownMetric(data.drawdown)}
                format="percent"
              />
              <RiskMetricCard
                label="Historical VaR 95"
                metric={data.historicalVar95}
                format="percent"
              />
              <RiskMetricCard
                label="Historical VaR 99"
                metric={data.historicalVar99}
                format="percent"
              />
              <RiskMetricCard
                label="Expected Shortfall 95"
                metric={data.expectedShortfall95}
                format="percent"
              />
              <RiskMetricCard
                label="HHI"
                metric={concentrationMetric(data.concentration, 'hhi')}
              />
            </section>
            <section
              className="concentration-section"
              aria-labelledby="concentration-title"
            >
              <div className="section-heading-inline">
                <div>
                  <h2 id="concentration-title">Yoğunlaşma</h2>
                  <p>
                    Sembol, sektör ve nakit ağırlıkları ayrı kategoriler olarak
                    gösterilir.
                  </p>
                </div>
              </div>
              {data.concentration.status === 'notEvaluable' ||
              data.concentration.value === null ? (
                <WorkspaceState kind="empty">
                  Yoğunlaşma hesaplanamadı:{' '}
                  {humanReason(data.concentration.reasonCode)}
                </WorkspaceState>
              ) : (
                <>
                  <dl className="concentration-summary">
                    <div>
                      <dt>En büyük pozisyon</dt>
                      <dd>
                        {formatPercent(
                          data.concentration.value.largestPositionWeight,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Top 3</dt>
                      <dd>
                        {formatPercent(data.concentration.value.top3Weight)}
                      </dd>
                    </div>
                    <div>
                      <dt>Top 5</dt>
                      <dd>
                        {formatPercent(data.concentration.value.top5Weight)}
                      </dd>
                    </div>
                    <div>
                      <dt>Nakit</dt>
                      <dd>
                        {formatPercent(data.concentration.value.cashWeight)}
                      </dd>
                    </div>
                    <div>
                      <dt>Bilinmeyen sektör</dt>
                      <dd>
                        {formatPercent(
                          data.concentration.value.unknownSectorWeight,
                        )}
                      </dd>
                    </div>
                  </dl>
                  <div className="market-table-wrap">
                    <table className="market-table">
                      <thead>
                        <tr>
                          <th>Kategori</th>
                          <th>Değer</th>
                          <th>Ağırlık</th>
                          <th>Sıra</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.concentration.value.exposures.map((exposure) => (
                          <tr key={`${exposure.type}-${exposure.key}`}>
                            <td>
                              <strong>{exposure.key}</strong>
                              <small>{exposureType(exposure.type)}</small>
                            </td>
                            <td>
                              {Number(exposure.marketValue).toLocaleString(
                                'tr-TR',
                              )}{' '}
                              ₺
                            </td>
                            <td>{formatPercent(exposure.weight)}</td>
                            <td>{exposure.rank ?? 'Uygulanmaz'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
            <section
              className="methodology-note"
              aria-labelledby="risk-methodology"
            >
              <h2 id="risk-methodology">Metodoloji ve veri kalitesi</h2>
              <p>
                Gözlem sayısı {data.observationCount}. Eksik tarihler sıfır
                getiri kabul edilmez ve benchmark serisi ortak tarihlerde
                hizalanır.
              </p>
              <dl className="methodology-values">
                <div>
                  <dt>Metodoloji sürümü</dt>
                  <dd>{data.riskPolicyVersion}</dd>
                </div>
                <div>
                  <dt>Benchmark</dt>
                  <dd>{data.benchmarkCode}</dd>
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

function RiskMetricCard({
  label,
  metric,
  format,
}: {
  readonly label: string;
  readonly metric: RiskMetric<string>;
  readonly format?: 'percent';
}) {
  const value =
    metric.status === 'complete' && metric.value !== null
      ? format === 'percent'
        ? formatPercent(metric.value)
        : Number(metric.value).toLocaleString('tr-TR', {
            maximumFractionDigits: 4,
          })
      : 'Hesaplanamadı';
  return (
    <article className="risk-metric-card">
      <h2>{label}</h2>
      <strong>{value}</strong>
      <p>
        {metric.status === 'complete'
          ? `${metric.observationCount} gözlem`
          : humanReason(metric.reasonCode)}
      </p>
      <small>{metric.methodologyVersion}</small>
    </article>
  );
}

function drawdownMetric(
  metric: Awaited<ReturnType<typeof portfolioApi.risk>>['drawdown'],
): RiskMetric<string> {
  return { ...metric, value: metric.value?.maximumDrawdown ?? null };
}

function concentrationMetric(
  metric: Awaited<ReturnType<typeof portfolioApi.risk>>['concentration'],
  key: 'hhi',
): RiskMetric<string> {
  return { ...metric, value: metric.value?.[key] ?? null };
}

function exposureType(type: 'instrument' | 'sector' | 'cash') {
  return { instrument: 'Sembol', sector: 'Sektör', cash: 'Nakit' }[type];
}
