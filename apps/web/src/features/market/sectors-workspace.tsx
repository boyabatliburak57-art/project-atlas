'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { AtlasShell } from '../portfolio/atlas-shell';
import { marketApi, safeMarketError } from './api';
import {
  DirectionValue,
  formatNumber,
  FreshnessBanner,
  MarketState,
} from './market-ui';

export function SectorsWorkspace() {
  const query = useQuery({
    queryKey: ['market', 'sectors'],
    queryFn: marketApi.sectors,
    retry: false,
  });
  const sorted = [...(query.data?.data.items ?? [])].sort(
    (left, right) =>
      Number(right.returnPercent ?? 0) - Number(left.returnPercent ?? 0),
  );
  return (
    <AtlasShell>
      <main className="intelligence-main">
        <header className="intelligence-heading compact">
          <div>
            <p className="rail-label">Sektör haritası</p>
            <h1>Para akışının yönü.</h1>
            <p>
              Eşit ağırlıklı günlük getiri, sektör breadth'i ve hacim aynı veri
              kesiminde karşılaştırılır.
            </p>
          </div>
          <nav aria-label="Piyasa bölümleri" className="intelligence-local-nav">
            <Link href="/market">Genel görünüm</Link>
            <Link className="active" href="/market/sectors">
              Sektörler
            </Link>
          </nav>
        </header>
        {query.isLoading && (
          <MarketState kind="loading">
            Sektör snapshot'ı yükleniyor.
          </MarketState>
        )}
        {query.isError && (
          <MarketState kind="error">{safeMarketError(query.error)}</MarketState>
        )}
        {query.data && <FreshnessBanner meta={query.data.meta} />}
        {query.data && (
          <>
            <section aria-label="Sektör liderleri" className="sector-extremes">
              <div>
                <span>En güçlü sektör</span>
                <strong>{sorted[0]?.sectorName ?? 'Veri yok'}</strong>
                <DirectionValue value={sorted[0]?.returnPercent} />
              </div>
              <div>
                <span>En zayıf sektör</span>
                <strong>{sorted.at(-1)?.sectorName ?? 'Veri yok'}</strong>
                <DirectionValue value={sorted.at(-1)?.returnPercent} />
              </div>
            </section>
            <section
              className="sector-table-wrap"
              aria-labelledby="sector-table-title"
            >
              <div className="section-heading-row">
                <div>
                  <p className="rail-label">Tüm sektörler</p>
                  <h2 id="sector-table-title">Performans ve katılım</h2>
                </div>
              </div>
              <table className="market-table">
                <thead>
                  <tr>
                    <th scope="col">Sektör</th>
                    <th scope="col">Getiri</th>
                    <th scope="col">Breadth</th>
                    <th scope="col">Yükselen / düşen</th>
                    <th scope="col">Hacim</th>
                    <th scope="col">Aksiyon</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((sector) => (
                    <tr key={sector.sectorId}>
                      <th scope="row">
                        {sector.sectorName}
                        <small>{sector.sectorCode}</small>
                      </th>
                      <td>
                        <DirectionValue value={sector.returnPercent} />
                      </td>
                      <td>{formatNumber(sector.breadthPercent)}%</td>
                      <td>
                        {sector.advancing ?? 0} / {sector.declining ?? 0}
                      </td>
                      <td>{formatNumber(sector.volume, 0)}</td>
                      <td>
                        <Link
                          className="text-link"
                          href={`/scanner?sector=${encodeURIComponent(sector.sectorCode)}`}
                        >
                          Scanner'da aç
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>
    </AtlasShell>
  );
}
