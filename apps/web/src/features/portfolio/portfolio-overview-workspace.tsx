'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { useMemo, useState } from 'react';

import { AtlasShell, WorkspaceState } from './atlas-shell';
import { portfolioApi } from './api';
import {
  DataWarning,
  errorMessage,
  formatDateTime,
  formatDecimal,
  formatMoney,
  formatPercent,
  formatSignedMoney,
  idempotencyKey,
  Metric,
  metricValue,
  PortfolioSubnav,
  signedTone,
} from './portfolio-ui';
import type { PositionProjection } from './types';

export function PortfolioOverviewWorkspace({
  portfolioId,
}: {
  readonly portfolioId: string;
}) {
  const client = useQueryClient();
  const portfolio = useQuery({
    queryKey: ['portfolios', portfolioId],
    queryFn: () => portfolioApi.portfolio(portfolioId),
    retry: false,
  });
  const positions = useQuery({
    queryKey: ['portfolios', portfolioId, 'positions'],
    queryFn: () => portfolioApi.positions(portfolioId),
    retry: false,
  });
  const valuation = useQuery({
    queryKey: ['portfolios', portfolioId, 'valuation'],
    queryFn: () => portfolioApi.valuation(portfolioId),
    retry: false,
  });
  const performance = useQuery({
    queryKey: ['portfolios', portfolioId, 'performance'],
    queryFn: () => portfolioApi.performance(portfolioId),
    retry: false,
  });
  const recalculate = useMutation({
    mutationFn: () =>
      portfolioApi.recalculate(portfolioId, idempotencyKey('recalculate')),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['portfolios', portfolioId] });
    },
  });

  if (portfolio.isLoading)
    return <ShellState kind="loading">Portföy yükleniyor.</ShellState>;
  if (portfolio.isError)
    return (
      <ShellState kind="error">{errorMessage(portfolio.error)}</ShellState>
    );
  if (!portfolio.data) return null;

  const series = performance.data?.dailyValueSeries ?? [];
  const today = series.at(-1);
  const yesterday = series.at(-2);
  const dailyChange =
    today && yesterday && Number(yesterday.value) !== 0
      ? String(Number(today.value) / Number(yesterday.value) - 1)
      : null;
  const benchmarkDifference =
    performance.data?.twr.status === 'complete' &&
    performance.data.benchmark.priceReturn !== null
      ? String(
          Number(performance.data.twr.value) -
            Number(performance.data.benchmark.priceReturn),
        )
      : null;

  return (
    <AtlasShell>
      <main className="portfolio-main portfolio-overview-main">
        <header className="portfolio-page-header">
          <div>
            <p className="rail-label">Ledger v{portfolio.data.ledgerVersion}</p>
            <h1>{portfolio.data.name}</h1>
            <p>
              {portfolio.data.description ??
                'Bu portföy için açıklama eklenmemiş.'}
            </p>
          </div>
          <button
            className="button outline"
            type="button"
            disabled={recalculate.isPending}
            onClick={() => recalculate.mutate()}
          >
            {recalculate.isPending ? 'Yeniden hesaplanıyor' : 'Yeniden hesapla'}
          </button>
        </header>
        <PortfolioSubnav portfolioId={portfolioId} />

        {recalculate.isPending && (
          <div className="recalculate-status" role="status">
            Projection ve analitik snapshot’lar yeniden hesaplanıyor.
          </div>
        )}
        {recalculate.error && (
          <p className="form-error" role="alert">
            {errorMessage(recalculate.error)}
          </p>
        )}

        {valuation.isLoading && (
          <WorkspaceState kind="loading">Değerleme yükleniyor.</WorkspaceState>
        )}
        {valuation.isError && (
          <WorkspaceState kind="error">
            Değerleme alınamadı. Eksik snapshot olabilir.
          </WorkspaceState>
        )}
        {valuation.data && (
          <>
            <DataWarning valuation={valuation.data} />
            <dl className="portfolio-metric-grid">
              <Metric
                label="Toplam değer"
                value={formatMoney(valuation.data.totalValue)}
              />
              <Metric
                label="Nakit"
                value={formatMoney(valuation.data.cashBalance)}
              />
              <Metric
                label="Net katkı"
                value={formatMoney(valuation.data.netContributions)}
              />
              <Metric
                label="Gerçekleşmiş P&L"
                value={formatSignedMoney(valuation.data.realizedPnl)}
                tone={signedTone(valuation.data.realizedPnl)}
                supporting={
                  valuation.data.realizedPnl === '0'
                    ? 'Henüz realize edilmedi'
                    : undefined
                }
              />
              <Metric
                label="Gerçekleşmemiş P&L"
                value={formatSignedMoney(valuation.data.unrealizedPnl)}
                tone={signedTone(valuation.data.unrealizedPnl)}
                supporting={
                  valuation.data.unrealizedPnl === null
                    ? 'Eksik fiyat nedeniyle hesaplanamadı'
                    : undefined
                }
              />
              <Metric
                label="Günlük değişim"
                value={
                  dailyChange === null
                    ? 'Hesaplanamadı'
                    : formatPercent(dailyChange)
                }
                tone={signedTone(dailyChange)}
              />
              <Metric label="TWR" value={metricValue(performance.data?.twr)} />
              <Metric
                label="Benchmark farkı"
                value={
                  benchmarkDifference === null
                    ? 'Hesaplanamadı'
                    : formatPercent(benchmarkDifference)
                }
                tone={signedTone(benchmarkDifference)}
              />
            </dl>
            <div className="portfolio-data-times">
              <span>
                Son güncelleme: {formatDateTime(valuation.data.valuationAt)}
              </span>
              <span>
                Data cutoff: {formatDateTime(valuation.data.dataCutoffAt)}
              </span>
            </div>
          </>
        )}

        <PositionsTable
          positions={positions.data ?? []}
          valuation={valuation.data}
          loading={positions.isLoading}
          error={positions.isError}
        />
      </main>
    </AtlasShell>
  );
}

function PositionsTable({
  positions,
  valuation,
  loading,
  error,
}: {
  readonly positions: readonly PositionProjection[];
  readonly valuation:
    | Awaited<ReturnType<typeof portfolioApi.valuation>>
    | undefined;
  readonly loading: boolean;
  readonly error: boolean;
}) {
  const [sort, setSort] = useState<'symbol' | 'marketValue' | 'weight'>(
    'marketValue',
  );
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const enriched = useMemo(() => {
    const values = new Map(
      valuation?.positions.map((item) => [item.instrumentId, item]),
    );
    const total = Number(valuation?.totalValue ?? '0');
    return positions
      .map((position) => {
        const current = values.get(position.instrumentId);
        return {
          ...position,
          valuation: current,
          weight:
            current?.marketValue !== null &&
            current?.marketValue !== undefined &&
            total > 0
              ? Number(current.marketValue) / total
              : null,
        };
      })
      .sort((left, right) => {
        const multiplier = direction === 'asc' ? 1 : -1;
        if (sort === 'symbol')
          return (
            multiplier *
            (left.symbol ?? left.instrumentId).localeCompare(
              right.symbol ?? right.instrumentId,
            )
          );
        const leftValue =
          sort === 'weight'
            ? left.weight
            : Number(left.valuation?.marketValue ?? Number.NEGATIVE_INFINITY);
        const rightValue =
          sort === 'weight'
            ? right.weight
            : Number(right.valuation?.marketValue ?? Number.NEGATIVE_INFINITY);
        return (
          multiplier *
          (Number(leftValue ?? -Infinity) - Number(rightValue ?? -Infinity))
        );
      });
  }, [direction, positions, sort, valuation]);
  const pageSize = 10;
  const visible = enriched.slice(page * pageSize, (page + 1) * pageSize);
  return (
    <section className="positions-section" aria-labelledby="positions-title">
      <div className="section-heading-inline">
        <div>
          <h2 id="positions-title">Pozisyonlar</h2>
          <p>Fiyatı eksik pozisyonlar piyasa değerine dahil edilmez.</p>
        </div>
        <div className="position-sort">
          <label>
            Sırala
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as typeof sort);
                setPage(0);
              }}
            >
              <option value="marketValue">Piyasa değeri</option>
              <option value="weight">Ağırlık</option>
              <option value="symbol">Sembol</option>
            </select>
          </label>
          <button
            className="button ghost"
            type="button"
            onClick={() =>
              setDirection((value) => (value === 'asc' ? 'desc' : 'asc'))
            }
          >
            {direction === 'asc' ? 'Artan' : 'Azalan'}
          </button>
        </div>
      </div>
      {loading && (
        <WorkspaceState kind="loading">Pozisyonlar yükleniyor.</WorkspaceState>
      )}
      {error && (
        <WorkspaceState kind="error">Pozisyonlar alınamadı.</WorkspaceState>
      )}
      {!loading && !error && visible.length === 0 && (
        <WorkspaceState kind="empty">
          Henüz açık pozisyon bulunmuyor.
        </WorkspaceState>
      )}
      {visible.length > 0 && (
        <div className="market-table-wrap">
          <table className="market-table position-table">
            <thead>
              <tr>
                <th>Sembol</th>
                <th>Miktar</th>
                <th>Ortalama maliyet</th>
                <th>Son fiyat</th>
                <th>Piyasa değeri</th>
                <th>Ağırlık</th>
                <th>Gerçekleşmemiş P&L</th>
                <th>Günlük değişim</th>
                <th>Sektör</th>
                <th>Veri zamanı</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((position) => (
                <tr
                  key={position.instrumentId}
                  className={clsx(
                    position.valuation?.status !== 'valued' && 'not-evaluable',
                  )}
                >
                  <td>
                    <strong>
                      {position.symbol ?? position.instrumentId.slice(0, 8)}
                    </strong>
                    <small>{position.company ?? 'Şirket bilgisi yok'}</small>
                  </td>
                  <td>{formatDecimal(position.quantity)}</td>
                  <td>{formatMoney(position.averageCost)}</td>
                  <td>{formatMoney(position.valuation?.marketPrice)}</td>
                  <td>{formatMoney(position.valuation?.marketValue)}</td>
                  <td>
                    {position.weight === null
                      ? 'Hesaplanamadı'
                      : formatPercent(String(position.weight))}
                  </td>
                  <td className={signedTone(position.valuation?.unrealizedPnl)}>
                    {formatSignedMoney(position.valuation?.unrealizedPnl)}
                  </td>
                  <td
                    className={signedTone(
                      position.valuation?.dailyChangePercent,
                    )}
                  >
                    {position.valuation?.dailyChangePercent == null
                      ? 'Veri yok'
                      : formatPercent(position.valuation.dailyChangePercent)}
                  </td>
                  <td>{position.sector ?? 'Bilinmiyor'}</td>
                  <td>{formatDateTime(position.valuation?.priceAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {enriched.length > pageSize && (
        <div className="pagination-row" aria-label="Pozisyon sayfalama">
          <button
            className="button ghost"
            type="button"
            disabled={page === 0}
            onClick={() => setPage((value) => value - 1)}
          >
            Önceki
          </button>
          <span>Sayfa {page + 1}</span>
          <button
            className="button ghost"
            type="button"
            disabled={(page + 1) * pageSize >= enriched.length}
            onClick={() => setPage((value) => value + 1)}
          >
            Sonraki
          </button>
        </div>
      )}
    </section>
  );
}

function ShellState({
  kind,
  children,
}: {
  readonly kind: 'loading' | 'error';
  readonly children: React.ReactNode;
}) {
  return (
    <AtlasShell>
      <main className="portfolio-main">
        <WorkspaceState kind={kind}>{children}</WorkspaceState>
      </main>
    </AtlasShell>
  );
}
