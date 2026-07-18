import { publicEnvironment } from '@/config/env';

import type {
  BreadthSummary,
  ChartMeta,
  ChartResponse,
  FinancialStatement,
  FinancialTrend,
  MarketMeta,
  MarketOverview,
  PatternInstance,
  Quote,
  QuoteMeta,
  RankingItem,
  RatioValue,
  SectorSummary,
  SymbolProfile,
} from './types';

const base = publicEnvironment.NEXT_PUBLIC_API_URL;

interface Envelope<T, M = Readonly<Record<string, unknown>>> {
  readonly data: T;
  readonly meta: M;
}

export class MarketApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
    this.name = 'MarketApiError';
  }
}

async function request<T, M = Readonly<Record<string, unknown>>>(
  path: string,
  init?: RequestInit,
): Promise<Envelope<T, M>> {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const body = (await response.json().catch(() => null)) as
    | Envelope<T, M>
    | { error?: { code?: string } }
    | null;
  if (!response.ok) {
    const error = body as { error?: { code?: string } } | null;
    throw new MarketApiError(
      error?.error?.code ?? `HTTP_${response.status}`,
      response.status,
    );
  }
  return body as Envelope<T, M>;
}

export const marketApi = {
  overview: () =>
    request<MarketOverview, MarketMeta>(
      '/market/overview?market=BIST&timeframe=1d',
    ),
  breadth: () =>
    request<BreadthSummary, MarketMeta>(
      '/market/breadth?market=BIST&timeframe=1d',
    ),
  sectors: () =>
    request<{ items: SectorSummary[] }, MarketMeta>(
      '/market/sectors?market=BIST&timeframe=1d',
    ),
  ranking: (type: string) =>
    request<{ items: RankingItem[] }, MarketMeta>(
      `/market/rankings/${type}?market=BIST&timeframe=1d&limit=10`,
    ),
  profile: (symbol: string) => request<SymbolProfile>(`/symbols/${symbol}`),
  quote: (symbol: string) =>
    request<Quote, QuoteMeta>(`/symbols/${symbol}/quote`),
  chart: (
    symbol: string,
    input: {
      timeframe: string;
      adjustmentMode: string;
      overlays: readonly string[];
      includeUserMarkers: boolean;
    },
  ) => {
    const query = new URLSearchParams({
      timeframe: input.timeframe,
      adjustmentMode: input.adjustmentMode,
      overlays: input.overlays.join(','),
      includePatterns: 'true',
      includeCorporateActions: 'true',
      includeUserMarkers: String(input.includeUserMarkers),
      limit: '500',
    });
    return request<ChartResponse, ChartMeta>(
      `/symbols/${symbol}/chart?${query}`,
    );
  },
  financials: (symbol: string, periodType: 'annual' | 'quarterly') =>
    request<FinancialStatement[]>(
      `/symbols/${symbol}/financials?periodType=${periodType}&limit=8`,
    ),
  ratios: (symbol: string, periodType: 'annual' | 'quarterly') =>
    request<RatioValue[]>(`/symbols/${symbol}/ratios?periodType=${periodType}`),
  trends: (symbol: string, periodType: 'annual' | 'quarterly') =>
    request<FinancialTrend[]>(
      `/symbols/${symbol}/financial-trends?periodType=${periodType}&metric=revenue&limit=8`,
    ),
  patterns: (symbol: string) =>
    request<PatternInstance[]>(
      `/symbols/${symbol}/patterns?timeframe=1d&adjustmentMode=raw&limit=50`,
    ),
  watchlists: () =>
    request<{ items: { id: string; name: string }[] }>('/watchlists?limit=1'),
  addToWatchlist: (watchlistId: string, instrumentId: string) =>
    request(`/watchlists/${watchlistId}/items`, {
      method: 'POST',
      body: JSON.stringify({ instrumentId, tags: ['symbol-detail'] }),
    }),
  createAlert: (instrumentId: string, symbol: string, price: string) =>
    request('/alerts', {
      method: 'POST',
      body: JSON.stringify({
        name: `${symbol} fiyat alarmı`,
        source: { type: 'instrument_price', instrumentId },
        triggerPolicy: 'thresholdCrossed',
        repeatPolicy: 'afterReset',
        timeframe: '1d',
        evaluationMode: 'closed_bar',
        channels: ['in_app'],
        sourceConfiguration: { operator: 'GTE', threshold: Number(price) },
      }),
    }),
};

export function safeMarketError(error: unknown) {
  const code =
    error instanceof MarketApiError ? error.code : 'MARKET_UI_FAILED';
  const messages: Readonly<Record<string, string>> = {
    MARKET_SNAPSHOT_NOT_AVAILABLE: 'Piyasa özeti henüz hazır değil.',
    SYMBOL_NOT_FOUND: 'Sembol bulunamadı.',
    CHART_RANGE_INVALID: 'Grafik tarih aralığı geçersiz.',
    CHART_OVERLAY_LIMIT_EXCEEDED: 'En fazla altı gösterge seçilebilir.',
    CHART_MARKER_ACCESS_DENIED:
      'Kullanıcı işaretleri için erişim doğrulanamadı. Özel işaretler gizlendi.',
  };
  return (
    messages[code] ??
    'Veri şu anda görüntülenemiyor. Daha sonra tekrar deneyin.'
  );
}
