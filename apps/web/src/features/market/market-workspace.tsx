'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { AtlasShell } from '../portfolio/atlas-shell';
import { marketApi, safeMarketError } from './api';
import {
  DirectionValue,
  formatNumber,
  FreshnessBanner,
  MarketState,
} from './market-ui';
import type { RankingItem } from './types';

const rankingTypes = [
  ['gainers', 'En çok yükselenler'],
  ['losers', 'En çok düşenler'],
  ['volume', 'Hacim liderleri'],
  ['relativeVolume', 'Göreli hacim'],
] as const;

export function MarketWorkspace() {
  const overview = useQuery({
    queryKey: ['market', 'overview'],
    queryFn: marketApi.overview,
    retry: false,
  });
  const breadth = useQuery({
    queryKey: ['market', 'breadth'],
    queryFn: marketApi.breadth,
    retry: false,
  });
  const sectors = useQuery({
    queryKey: ['market', 'sectors'],
    queryFn: marketApi.sectors,
    retry: false,
  });
  const rankings = useQueries({
    queries: rankingTypes.map(([type]) => ({
      queryKey: ['market', 'ranking', type],
      queryFn: () => marketApi.ranking(type),
      retry: false,
    })),
  });

  return (
    <AtlasShell>
      <main className="intelligence-main">
        <header className="intelligence-heading">
          <div>
            <p className="rail-label">Market intelligence</p>
            <h1>Piyasanın nabzı, tek kesimde.</h1>
            <p>
              Endeks, genişlik, liderler ve sektörler aynı mantıksal veri
              zamanında okunur.
            </p>
          </div>
          <nav aria-label="Piyasa bölümleri" className="intelligence-local-nav">
            <Link className="active" href="/market">
              Genel görünüm
            </Link>
            <Link href="/market/sectors">Sektörler</Link>
          </nav>
        </header>

        {overview.isLoading && (
          <MarketState kind="loading">
            Piyasa snapshot'ı yükleniyor.
          </MarketState>
        )}
        {overview.isError && (
          <MarketState kind="error">
            {safeMarketError(overview.error)}
          </MarketState>
        )}
        {overview.data && <FreshnessBanner meta={overview.data.meta} />}

        {overview.data && (
          <section aria-labelledby="indices-title" className="index-board">
            <div className="section-heading-row">
              <div>
                <p className="rail-label">Endeksler</p>
                <h2 id="indices-title">Kapanış görünümü</h2>
              </div>
              <span className="market-session">
                {overview.data.data.marketState ?? 'Piyasa durumu bilinmiyor'}
              </span>
            </div>
            <dl className="index-metrics">
              {(overview.data.data.indices ?? []).map((index) => (
                <div key={index.code}>
                  <dt>
                    {index.name} <small>{index.code}</small>
                  </dt>
                  <dd>{formatNumber(index.value)}</dd>
                  <small>
                    <DirectionValue value={index.changePercent} />
                  </small>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section aria-labelledby="breadth-title" className="breadth-board">
          <div>
            <p className="rail-label">Piyasa genişliği</p>
            <h2 id="breadth-title">Katılım ne kadar güçlü?</h2>
            <p>
              Eksik semboller paydaya eklenmez. Değerlendirilen ve hariç tutulan
              sayılar ayrı gösterilir.
            </p>
          </div>
          {breadth.isLoading ? (
            <MarketState kind="loading">
              Genişlik hesapları yükleniyor.
            </MarketState>
          ) : breadth.data ? (
            <dl className="breadth-metrics">
              <div>
                <dt>Yükselen</dt>
                <dd className="positive">
                  Yükseliş {breadth.data.data.advancing ?? 0}
                </dd>
              </div>
              <div>
                <dt>Düşen</dt>
                <dd className="negative">
                  Düşüş {breadth.data.data.declining ?? 0}
                </dd>
              </div>
              <div>
                <dt>Değişmeyen</dt>
                <dd>{breadth.data.data.unchanged ?? 0}</dd>
              </div>
              <div>
                <dt>Değerlendirilen</dt>
                <dd>{breadth.data.data.evaluatedCount}</dd>
                <small>{breadth.data.data.excludedCount} sembol hariç</small>
              </div>
            </dl>
          ) : (
            <MarketState kind="error">
              {safeMarketError(breadth.error)}
            </MarketState>
          )}
        </section>

        <section aria-labelledby="rankings-title" className="rankings-section">
          <div className="section-heading-row">
            <div>
              <p className="rail-label">Lider listeleri</p>
              <h2 id="rankings-title">Hareketin kaynakları</h2>
            </div>
          </div>
          <div className="ranking-grid">
            {rankingTypes.map(([type, label], index) => (
              <RankingTable
                key={type}
                label={label}
                items={rankings[index]?.data?.data.items ?? []}
                loading={rankings[index]?.isLoading ?? false}
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="sector-title" className="sector-preview">
          <div className="section-heading-row">
            <div>
              <p className="rail-label">Sektörler</p>
              <h2 id="sector-title">Güç dağılımı</h2>
            </div>
            <Link className="text-link" href="/market/sectors">
              Tüm sektörleri incele
            </Link>
          </div>
          {sectors.data ? (
            <div className="sector-strip">
              {sectors.data.data.items.slice(0, 6).map((sector) => (
                <Link
                  key={sector.sectorId}
                  href={`/market/sectors?sector=${sector.sectorCode}`}
                >
                  <span>{sector.sectorName}</span>
                  <DirectionValue value={sector.returnPercent} />
                </Link>
              ))}
            </div>
          ) : (
            <MarketState kind={sectors.isError ? 'error' : 'loading'}>
              {sectors.isError
                ? safeMarketError(sectors.error)
                : 'Sektör özeti yükleniyor.'}
            </MarketState>
          )}
        </section>

        <section aria-labelledby="preset-title" className="preset-links">
          <div>
            <p className="rail-label">Hazır taramalar</p>
            <h2 id="preset-title">Görünümden aksiyona</h2>
          </div>
          <nav aria-label="Hazır tarama bağlantıları">
            <Link href="/scanner?preset=momentum-breakout">
              Momentum kırılımı
            </Link>
            <Link href="/scanner?preset=oversold-reversal">
              Aşırı satım dönüşü
            </Link>
            <Link href="/scanner?preset=volume-expansion">
              Hacim genişlemesi
            </Link>
          </nav>
        </section>
      </main>
    </AtlasShell>
  );
}

function RankingTable({
  label,
  items,
  loading,
}: {
  readonly label: string;
  readonly items: readonly RankingItem[];
  readonly loading: boolean;
}) {
  return (
    <section aria-label={label} className="ranking-table-block">
      <h3>{label}</h3>
      {loading ? (
        <MarketState kind="loading">Liste yükleniyor.</MarketState>
      ) : items.length === 0 ? (
        <MarketState kind="empty">Bu kesim için sonuç yok.</MarketState>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col">Sembol</th>
              <th scope="col">Değer</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 5).map((item) => (
              <tr key={item.instrumentId}>
                <th scope="row">
                  <Link href={`/symbols/${item.symbol}`}>{item.symbol}</Link>
                  <small>{item.company}</small>
                </th>
                <td>
                  <DirectionValue
                    value={item.changePercent ?? item.sortValue}
                    suffix={item.volume ? '' : '%'}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
