'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import Link from 'next/link';
import { useState } from 'react';

import { AtlasShell } from '../portfolio/atlas-shell';
import { marketApi, safeMarketError } from './api';
import {
  DirectionValue,
  formatDateTime,
  formatNumber,
  humanCode,
  MarketState,
} from './market-ui';
import type { ChartBar, FinancialStatement, PatternInstance } from './types';

type SymbolTab =
  | 'overview'
  | 'chart'
  | 'financials'
  | 'patterns'
  | 'scans'
  | 'alerts';
const tabs: readonly { id: SymbolTab; label: string }[] = [
  { id: 'overview', label: 'Genel bakış' },
  { id: 'chart', label: 'Grafik' },
  { id: 'financials', label: 'Finansallar' },
  { id: 'patterns', label: 'Formasyonlar' },
  { id: 'scans', label: 'Taramalar' },
  { id: 'alerts', label: 'Alarmlar' },
];
const overlayOptions = [
  { code: 'SMA', label: 'SMA' },
  { code: 'EMA', label: 'EMA' },
  { code: 'BOLLINGER_BANDS', label: 'Bollinger' },
  { code: 'MACD', label: 'MACD' },
  { code: 'RSI', label: 'RSI' },
  { code: 'ATR', label: 'ATR' },
] as const;

export function SymbolWorkspace({ symbol }: { readonly symbol: string }) {
  const normalizedSymbol = symbol.toUpperCase();
  const [tab, setTab] = useState<SymbolTab>('overview');
  const [timeframe, setTimeframe] = useState('1d');
  const [adjustmentMode, setAdjustmentMode] = useState('raw');
  const [overlays, setOverlays] = useState<string[]>(['SMA', 'EMA', 'RSI']);
  const [periodType, setPeriodType] = useState<'annual' | 'quarterly'>(
    'annual',
  );
  const [patternState, setPatternState] =
    useState<PatternInstance['state']>('candidate');
  const profile = useQuery({
    queryKey: ['symbol', normalizedSymbol, 'profile'],
    queryFn: () => marketApi.profile(normalizedSymbol),
    retry: false,
  });
  const quote = useQuery({
    queryKey: ['symbol', normalizedSymbol, 'quote'],
    queryFn: () => marketApi.quote(normalizedSymbol),
    retry: false,
  });
  const chart = useQuery({
    queryKey: [
      'symbol',
      normalizedSymbol,
      'chart',
      timeframe,
      adjustmentMode,
      overlays,
    ],
    queryFn: () =>
      marketApi.chart(normalizedSymbol, {
        timeframe,
        adjustmentMode,
        overlays,
        includeUserMarkers: true,
      }),
    retry: false,
  });
  const financials = useQuery({
    queryKey: ['symbol', normalizedSymbol, 'financials', periodType],
    queryFn: () => marketApi.financials(normalizedSymbol, periodType),
    retry: false,
  });
  const ratios = useQuery({
    queryKey: ['symbol', normalizedSymbol, 'ratios', periodType],
    queryFn: () => marketApi.ratios(normalizedSymbol, periodType),
    retry: false,
  });
  const trends = useQuery({
    queryKey: ['symbol', normalizedSymbol, 'trends', periodType],
    queryFn: () => marketApi.trends(normalizedSymbol, periodType),
    retry: false,
  });
  const patterns = useQuery({
    queryKey: ['symbol', normalizedSymbol, 'patterns'],
    queryFn: () => marketApi.patterns(normalizedSymbol),
    retry: false,
  });

  const watchlist = useMutation({
    mutationFn: async () => {
      const lists = await marketApi.watchlists();
      const target = lists.data.items[0];
      if (!target) throw new Error('WATCHLIST_NOT_AVAILABLE');
      return marketApi.addToWatchlist(target.id, profile.data!.data.id);
    },
  });
  const alert = useMutation({
    mutationFn: () =>
      marketApi.createAlert(
        profile.data!.data.id,
        normalizedSymbol,
        quote.data?.data.price ?? '0',
      ),
  });

  if (profile.isLoading)
    return (
      <AtlasShell>
        <main className="intelligence-main">
          <MarketState kind="loading">Sembol yükleniyor.</MarketState>
        </main>
      </AtlasShell>
    );
  if (profile.isError || !profile.data)
    return (
      <AtlasShell>
        <main className="intelligence-main">
          <MarketState kind="error">
            {safeMarketError(profile.error)}
          </MarketState>
        </main>
      </AtlasShell>
    );

  const instrument = profile.data.data;
  return (
    <AtlasShell>
      <main className="symbol-main">
        <header className="symbol-header">
          <div className="symbol-identity">
            <Link className="text-link" href="/market">
              Piyasa görünümüne dön
            </Link>
            <div>
              <h1>{instrument.symbol}</h1>
              <span>{instrument.name}</span>
            </div>
            <p>
              {instrument.sector?.name ?? 'Sektör bilgisi yok'} ·{' '}
              {instrument.marketCode}
            </p>
          </div>
          <div className="symbol-quote" aria-live="polite">
            <span>Son fiyat</span>
            <strong>{formatNumber(quote.data?.data.price)} ₺</strong>
            <DirectionValue value={quote.data?.data.changePercent} />
            <small>Kesim {formatDateTime(quote.data?.meta.dataCutoffAt)}</small>
          </div>
        </header>

        {(quote.data?.meta.partial || quote.data?.meta.stale) && (
          <div
            className={clsx(
              'intelligence-freshness',
              quote.data.meta.stale ? 'stale' : 'partial',
            )}
            role="status"
          >
            <strong>
              {quote.data.meta.stale
                ? 'Gecikmiş fiyat verisi'
                : 'Kısmi sembol verisi'}
            </strong>
            <span>Eksik alanlar sıfır olarak gösterilmez.</span>
          </div>
        )}

        <nav aria-label="Sembol bölümleri" className="symbol-tabs">
          {tabs.map((item) => (
            <button
              key={item.id}
              aria-selected={tab === item.id}
              className={clsx(tab === item.id && 'active')}
              onClick={() => setTab(item.id)}
              role="tab"
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {tab === 'overview' && (
          <OverviewPanel
            alertPending={alert.isPending}
            alertSuccess={alert.isSuccess}
            instrumentId={instrument.id}
            onAlert={() => alert.mutate()}
            onWatchlist={() => watchlist.mutate()}
            quote={quote.data?.data}
            symbol={instrument.symbol}
            watchlistPending={watchlist.isPending}
            watchlistSuccess={watchlist.isSuccess}
          />
        )}
        {tab === 'chart' && (
          <ChartPanel
            adjustmentMode={adjustmentMode}
            chart={chart}
            onAdjustment={setAdjustmentMode}
            onOverlays={setOverlays}
            onTimeframe={setTimeframe}
            overlays={overlays}
            timeframe={timeframe}
          />
        )}
        {tab === 'financials' && (
          <FinancialsPanel
            financials={financials}
            onPeriodType={setPeriodType}
            periodType={periodType}
            ratios={ratios}
            trends={trends}
          />
        )}
        {tab === 'patterns' && (
          <PatternsPanel
            onState={setPatternState}
            patterns={patterns.data?.data ?? []}
            state={patternState}
          />
        )}
        {tab === 'scans' && (
          <ActionPanel
            title="Bu sembolü tarama kuralına ekle"
            copy="Sembol evren filtresi Scanner ekranına aktarılır; kuralı çalıştırmadan önce düzenleyebilirsiniz."
            href={`/scanner?symbol=${encodeURIComponent(instrument.symbol)}`}
            label="Scanner condition oluştur"
          />
        )}
        {tab === 'alerts' && (
          <ActionPanel
            title="Fiyat ve formasyon alarmı"
            copy="Alarm koşulları backend tarafından doğrulanır ve yalnız kapalı bar politikasıyla değerlendirilir."
            label={
              alert.isSuccess ? 'Alarm oluşturuldu' : 'Son fiyata alarm oluştur'
            }
            onClick={() => alert.mutate()}
            pending={alert.isPending}
          />
        )}
      </main>
    </AtlasShell>
  );
}

function OverviewPanel(props: {
  readonly symbol: string;
  readonly instrumentId: string;
  readonly quote:
    | {
        price: string | null;
        high: string | null;
        low: string | null;
        volume: string | null;
      }
    | undefined;
  readonly onWatchlist: () => void;
  readonly onAlert: () => void;
  readonly watchlistPending: boolean;
  readonly watchlistSuccess: boolean;
  readonly alertPending: boolean;
  readonly alertSuccess: boolean;
}) {
  return (
    <section className="symbol-overview" aria-labelledby="overview-title">
      <div>
        <p className="rail-label">Seans özeti</p>
        <h2 id="overview-title">Fiyat ve likidite</h2>
        <dl className="symbol-stat-grid">
          <div>
            <dt>Gün içi yüksek</dt>
            <dd>{formatNumber(props.quote?.high)} ₺</dd>
          </div>
          <div>
            <dt>Gün içi düşük</dt>
            <dd>{formatNumber(props.quote?.low)} ₺</dd>
          </div>
          <div>
            <dt>Hacim</dt>
            <dd>{formatNumber(props.quote?.volume, 0)}</dd>
          </div>
          <div>
            <dt>Enstrüman ID</dt>
            <dd className="mono-value">{props.instrumentId}</dd>
          </div>
        </dl>
      </div>
      <aside className="symbol-actions" aria-label="Sembol aksiyonları">
        <p className="rail-label">Entegrasyonlar</p>
        <button
          className="button primary"
          disabled={props.watchlistPending || props.watchlistSuccess}
          onClick={props.onWatchlist}
          type="button"
        >
          {props.watchlistSuccess ? 'Watchlist’e eklendi' : 'Watchlist’e ekle'}
        </button>
        <button
          className="button ghost"
          disabled={props.alertPending || props.alertSuccess}
          onClick={props.onAlert}
          type="button"
        >
          {props.alertSuccess ? 'Alarm oluşturuldu' : 'Alarm oluştur'}
        </button>
        <Link
          className="button ghost"
          href={`/scanner?symbol=${encodeURIComponent(props.symbol)}`}
        >
          Scanner condition’a ekle
        </Link>
        <Link
          className="button ghost"
          href={`/portfolios?action=transaction&symbol=${encodeURIComponent(props.symbol)}`}
        >
          Portföy işlemine aktar
        </Link>
      </aside>
    </section>
  );
}

function ChartPanel(props: {
  readonly timeframe: string;
  readonly adjustmentMode: string;
  readonly overlays: readonly string[];
  readonly onTimeframe: (value: string) => void;
  readonly onAdjustment: (value: string) => void;
  readonly onOverlays: (value: string[]) => void;
  readonly chart: ReturnType<
    typeof useQuery<Awaited<ReturnType<typeof marketApi.chart>>>
  >;
}) {
  const toggle = (code: string) => {
    const next = props.overlays.includes(code)
      ? props.overlays.filter((item) => item !== code)
      : [...props.overlays, code];
    if (next.length <= 6) props.onOverlays(next);
  };
  return (
    <section className="chart-panel" aria-labelledby="chart-title">
      <div className="chart-toolbar">
        <div>
          <span>Zaman dilimi</span>
          <div role="group" aria-label="Chart timeframe">
            {['5m', '15m', '1h', '1d', '1w'].map((value) => (
              <button
                key={value}
                className={clsx(props.timeframe === value && 'active')}
                onClick={() => props.onTimeframe(value)}
                type="button"
              >
                {value}
              </button>
            ))}
          </div>
        </div>
        <label>
          <span>Düzeltme modu</span>
          <select
            aria-label="Adjustment mode"
            onChange={(event) => props.onAdjustment(event.target.value)}
            value={props.adjustmentMode}
          >
            <option value="raw">Ham</option>
            <option value="split-adjusted">Bölünme düzeltilmiş</option>
            <option value="total-return">Toplam getiri</option>
          </select>
        </label>
      </div>
      <fieldset className="overlay-picker">
        <legend>Göstergeler, en fazla altı</legend>
        {overlayOptions.map((item) => (
          <label key={item.code}>
            <input
              checked={props.overlays.includes(item.code)}
              onChange={() => toggle(item.code)}
              type="checkbox"
            />
            {item.label}
          </label>
        ))}
        <span>{props.overlays.length}/6 seçili</span>
      </fieldset>
      {props.chart.isLoading && (
        <MarketState kind="loading">Grafik verisi yükleniyor.</MarketState>
      )}
      {props.chart.isError && (
        <MarketState kind="error">
          {safeMarketError(props.chart.error)}
        </MarketState>
      )}
      {props.chart.data && (
        <AccessibleChart
          data={props.chart.data.data}
          cutoff={props.chart.data.meta.dataCutoffAt}
        />
      )}
    </section>
  );
}

function AccessibleChart({
  data,
  cutoff,
}: {
  readonly data: Awaited<ReturnType<typeof marketApi.chart>>['data'];
  readonly cutoff: string;
}) {
  const bars = data.bars;
  const closes = bars.map((bar) => Number(bar.close)).filter(Number.isFinite);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const last = bars.at(-1);
  return (
    <>
      <div
        className="chart-stage"
        role="img"
        aria-label={`${data.instrument.symbol} ${data.timeframe} grafiği. Son kapanış ${formatNumber(last?.close)} Türk lirası. ${data.overlays.length} overlay ve ${data.panels.length} panel göstergesi.`}
      >
        <div className="chart-columns">
          {bars.slice(-80).map((bar) => (
            <ChartColumn key={bar.time} bar={bar} min={min} max={max} />
          ))}
        </div>
        <div className="chart-marker-layer" aria-label="Grafik işaretleri">
          {data.markers.map((marker) => (
            <span
              key={`${marker.type}:${marker.time}:${marker.label}`}
              className={clsx('chart-marker', marker.type)}
              title={marker.label}
            >
              {marker.type === 'corporateAction'
                ? 'Kurumsal aksiyon'
                : marker.type === 'pattern'
                  ? 'Formasyon'
                  : 'Kullanıcı işareti'}
              : {marker.label}
            </span>
          ))}
        </div>
      </div>
      <div className="chart-text-summary">
        <h2 id="chart-title">Grafik metin özeti</h2>
        <p>
          Son kapanış {formatNumber(last?.close)} ₺. En yüksek{' '}
          {formatNumber(max)} ₺, en düşük {formatNumber(min)} ₺. Veri kesimi{' '}
          {formatDateTime(cutoff)}.
        </p>
        <p>
          Overlay:{' '}
          {data.overlays
            .map((item) => `${item.indicatorCode} v${item.indicatorVersion}`)
            .join(', ') || 'Seçili değil'}
          . Panel:{' '}
          {data.panels.map((item) => item.indicatorCode).join(', ') ||
            'Seçili değil'}
          .
        </p>
        <p>
          Hacim: {formatNumber(last?.volume, 0)}. {data.markers.length} işaret
          gösteriliyor.
        </p>
      </div>
    </>
  );
}

function ChartColumn({
  bar,
  min,
  max,
}: {
  readonly bar: ChartBar;
  readonly min: number;
  readonly max: number;
}) {
  const close = Number(bar.close);
  const height = max === min ? 50 : 12 + ((close - min) / (max - min)) * 78;
  return (
    <button
      aria-label={`${new Date(bar.time * 1000).toLocaleDateString('tr-TR')}: açılış ${bar.open}, yüksek ${bar.high}, düşük ${bar.low}, kapanış ${bar.close}, hacim ${bar.volume}`}
      className={clsx(
        'chart-column',
        Number(bar.close) >= Number(bar.open) ? 'up' : 'down',
      )}
      style={{ height: `${height}%` }}
      title={`Kapanış ${bar.close} ₺`}
      type="button"
    />
  );
}

function FinancialsPanel(props: {
  readonly periodType: 'annual' | 'quarterly';
  readonly onPeriodType: (value: 'annual' | 'quarterly') => void;
  readonly financials: ReturnType<
    typeof useQuery<Awaited<ReturnType<typeof marketApi.financials>>>
  >;
  readonly ratios: ReturnType<
    typeof useQuery<Awaited<ReturnType<typeof marketApi.ratios>>>
  >;
  readonly trends: ReturnType<
    typeof useQuery<Awaited<ReturnType<typeof marketApi.trends>>>
  >;
}) {
  const rows = props.financials.data?.data ?? [];
  const duplicatePeriods = duplicatePeriodKeys(rows);
  return (
    <section className="financial-panel" aria-labelledby="financial-title">
      <div className="section-heading-row">
        <div>
          <p className="rail-label">Finansallar</p>
          <h2 id="financial-title">Dönemsel görünüm</h2>
        </div>
        <div
          className="segmented-control"
          role="group"
          aria-label="Finansal dönem türü"
        >
          <button
            className={clsx(props.periodType === 'annual' && 'active')}
            onClick={() => props.onPeriodType('annual')}
            type="button"
          >
            Yıllık
          </button>
          <button
            className={clsx(props.periodType === 'quarterly' && 'active')}
            onClick={() => props.onPeriodType('quarterly')}
            type="button"
          >
            Çeyreklik
          </button>
        </div>
      </div>
      {props.financials.isLoading ? (
        <MarketState kind="loading">Finansallar yükleniyor.</MarketState>
      ) : props.financials.isError ? (
        <MarketState kind="error">
          {safeMarketError(props.financials.error)}
        </MarketState>
      ) : (
        <div className="financial-table-wrap">
          <table className="market-table">
            <thead>
              <tr>
                <th scope="col">Dönem</th>
                <th scope="col">Hasılat</th>
                <th scope="col">FAVÖK</th>
                <th scope="col">Net kâr</th>
                <th scope="col">Revizyon</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((statement) => (
                <tr key={`${statement.period}:${statement.providerRevision}`}>
                  <th scope="row">
                    {statement.period}
                    <small>{formatDateTime(statement.periodEnd)}</small>
                  </th>
                  <td>{metricValue(statement, 'revenue')}</td>
                  <td>{metricValue(statement, 'ebitda')}</td>
                  <td>{metricValue(statement, 'netIncome')}</td>
                  <td>
                    {duplicatePeriods.has(statement.period) ? (
                      <span className="restatement-badge">
                        Yeniden düzenlendi
                      </span>
                    ) : (
                      statement.providerRevision
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <section aria-labelledby="trend-title" className="financial-trend">
        <h3 id="trend-title">Hasılat trendi</h3>
        <div
          role="img"
          aria-label="Hasılat dönem trendi"
          className="trend-bars"
        >
          {(props.trends.data?.data ?? []).map((point) => (
            <div key={`${point.period}:${point.providerRevision}`}>
              <span
                style={{
                  height: `${Math.max(10, Math.min(100, Number(point.value ?? 0) / 10))}%`,
                }}
              />
              <small>{point.period}</small>
            </div>
          ))}
        </div>
      </section>
      <section aria-labelledby="ratios-title" className="ratio-section">
        <h3 id="ratios-title">Oranlar ve metodoloji</h3>
        <dl className="ratio-grid">
          {(props.ratios.data?.data ?? []).map((ratio) => (
            <div key={ratio.code}>
              <dt>
                {humanCode(ratio.code)}{' '}
                <button
                  aria-label={`${humanCode(ratio.code)} metodolojisi`}
                  className="method-info"
                  title={`${ratio.formulaVersion}. Eksik veya geçersiz payda sıfır kabul edilmez.`}
                  type="button"
                >
                  Bilgi
                </button>
              </dt>
              <dd>
                {ratio.status === 'complete'
                  ? formatNumber(ratio.value)
                  : 'Hesaplanamadı'}
              </dd>
              <small>
                {ratio.status === 'complete'
                  ? ratio.formulaVersion
                  : (ratio.reasonCode ?? 'Veri yok')}
              </small>
            </div>
          ))}
        </dl>
      </section>
    </section>
  );
}

function PatternsPanel({
  patterns,
  state,
  onState,
}: {
  readonly patterns: readonly PatternInstance[];
  readonly state: PatternInstance['state'];
  readonly onState: (value: PatternInstance['state']) => void;
}) {
  const filtered = patterns.filter((pattern) => pattern.state === state);
  return (
    <section className="patterns-panel" aria-labelledby="patterns-title">
      <div className="section-heading-row">
        <div>
          <p className="rail-label">Teknik formasyonlar</p>
          <h2 id="patterns-title">Kanıt noktalarıyla adaylar</h2>
        </div>
      </div>
      <div className="pattern-warning" role="note">
        Formasyon sonuçları algoritmik adaylardır; kesin tahmin veya yatırım
        tavsiyesi değildir.
      </div>
      <div
        className="segmented-control"
        role="group"
        aria-label="Formasyon durumu"
      >
        {(['candidate', 'confirmed', 'invalidated'] as const).map((value) => (
          <button
            key={value}
            className={clsx(state === value && 'active')}
            onClick={() => onState(value)}
            type="button"
          >
            {value === 'candidate'
              ? 'Aday'
              : value === 'confirmed'
                ? 'Onaylandı'
                : 'Geçersiz'}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <MarketState kind="empty">Bu durumda formasyon yok.</MarketState>
      ) : (
        <div className="pattern-list">
          {filtered.map((pattern) => (
            <article key={pattern.id}>
              <header>
                <div>
                  <span className={clsx('pattern-state', pattern.state)}>
                    {pattern.state}
                  </span>
                  <h3>{pattern.code.replaceAll('_', ' ')}</h3>
                </div>
                <span>{pattern.direction}</span>
              </header>
              <dl>
                <div>
                  <dt>Algoritma</dt>
                  <dd>{pattern.algorithmVersion}</dd>
                </div>
                <div>
                  <dt>Tespit barı</dt>
                  <dd>{formatDateTime(pattern.detectedAt)}</dd>
                </div>
                <div>
                  <dt>Data cutoff</dt>
                  <dd>{formatDateTime(pattern.dataCutoffAt)}</dd>
                </div>
                <div>
                  <dt>Confidence</dt>
                  <dd>
                    {pattern.confidence === null
                      ? 'Hesaplanmadı: açıklanabilir formül yok'
                      : pattern.confidence}
                  </dd>
                </div>
              </dl>
              <div className="evidence-list">
                <strong>Kanıt noktaları</strong>
                {(pattern.evidence.points ?? []).map((point) => (
                  <span key={`${point.time}:${point.role}`}>
                    {point.role}: {point.price} ₺, {formatDateTime(point.time)}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ActionPanel(props: {
  readonly title: string;
  readonly copy: string;
  readonly label: string;
  readonly href?: string;
  readonly onClick?: () => void;
  readonly pending?: boolean;
}) {
  return (
    <section className="action-panel">
      <p className="rail-label">Entegrasyon</p>
      <h2>{props.title}</h2>
      <p>{props.copy}</p>
      {props.href ? (
        <Link className="button primary" href={props.href}>
          {props.label}
        </Link>
      ) : (
        <button
          className="button primary"
          disabled={props.pending}
          onClick={props.onClick}
          type="button"
        >
          {props.label}
        </button>
      )}
    </section>
  );
}

function metricValue(statement: FinancialStatement, code: string) {
  const metric = statement.metrics.find((item) => item.code === code);
  return metric?.status === 'complete'
    ? formatNumber(metric.value)
    : 'Veri yok';
}

function duplicatePeriodKeys(statements: readonly FinancialStatement[]) {
  const counts = new Map<string, number>();
  for (const statement of statements)
    counts.set(statement.period, (counts.get(statement.period) ?? 0) + 1);
  return new Set(
    [...counts].filter(([, count]) => count > 1).map(([period]) => period),
  );
}
