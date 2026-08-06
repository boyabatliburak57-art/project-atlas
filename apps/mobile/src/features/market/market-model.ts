export type DataAvailability =
  | 'available'
  | 'delayed'
  | 'stale'
  | 'partial'
  | 'providerRequired'
  | 'capabilityUnavailable'
  | 'marketClosed'
  | 'notEvaluable'
  | 'demo';

export interface OhlcvPoint {
  readonly time: string;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
}

export interface ChartSummary {
  readonly first: number;
  readonly last: number;
  readonly highest: number;
  readonly lowest: number;
  readonly changePercent: number;
  readonly pointCount: number;
}

export const supportedTimeframes = [
  '1D',
  '1W',
  '1M',
  '3M',
  '6M',
  'YTD',
  '1Y',
  '5Y',
  'MAX',
] as const;
export type Timeframe = (typeof supportedTimeframes)[number];

export function normalizeSearchQuery(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ').slice(0, 80);
}

export function canSearch(value: string): boolean {
  return normalizeSearchQuery(value).length >= 2;
}

export function validateOhlcv(
  points: readonly OhlcvPoint[],
): readonly OhlcvPoint[] {
  let previous = '';
  const seen = new Set<string>();
  for (const point of points) {
    if (seen.has(point.time) || point.time <= previous)
      throw new Error('CHART_TIME_AXIS_INVALID');
    if (
      point.low > Math.min(point.open, point.close) ||
      point.high < Math.max(point.open, point.close) ||
      point.high < point.low ||
      point.volume < 0
    )
      throw new Error('CHART_OHLC_INVARIANT_INVALID');
    seen.add(point.time);
    previous = point.time;
  }
  return points;
}

export function summarizeChart(
  points: readonly OhlcvPoint[],
): ChartSummary | null {
  if (points.length === 0) return null;
  validateOhlcv(points);
  const first = points[0]!.close;
  const last = points.at(-1)!.close;
  return {
    first,
    last,
    highest: Math.max(...points.map((point) => point.high)),
    lowest: Math.min(...points.map((point) => point.low)),
    changePercent: first === 0 ? 0 : ((last - first) / first) * 100,
    pointCount: points.length,
  };
}

export function breadthPercent(
  advancing: number,
  unchanged: number,
  declining: number,
) {
  const evaluated = advancing + unchanged + declining;
  return evaluated === 0 ? null : (advancing / evaluated) * 100;
}

export function safeSharePayload(input: {
  readonly symbol: string;
  readonly company: string;
  readonly deepLink: string;
}): string {
  if (!/^atlas:\/\/symbol\/[A-Z0-9._-]{1,32}$/u.test(input.deepLink))
    throw new Error('SHARE_LINK_NOT_ALLOWED');
  return `${input.symbol} · ${input.company}\n${input.deepLink}\nAtlas yatırım tavsiyesi vermez.`;
}

export function isAllowedCompanyUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

export class RecentSearches {
  private readonly values = new Map<string, { label: string; at: string }>();
  constructor(private readonly maximum = 8) {}
  add(label: string, at = new Date().toISOString()) {
    const normalized = normalizeSearchQuery(label);
    if (!canSearch(normalized)) return this.list();
    this.values.delete(normalized.toLocaleLowerCase('tr-TR'));
    this.values.set(normalized.toLocaleLowerCase('tr-TR'), {
      label: normalized,
      at,
    });
    while (this.values.size > this.maximum)
      this.values.delete(this.values.keys().next().value as string);
    return this.list();
  }
  clear() {
    this.values.clear();
  }
  list() {
    return [...this.values.values()].reverse();
  }
}

export function redactMarketTelemetry(
  event: string,
  input: Readonly<Record<string, unknown>>,
) {
  const forbidden = /query|token|user|portfolio|watchlist|credential|payload/iu;
  return {
    event,
    attributes: Object.fromEntries(
      Object.entries(input).filter(([key]) => !forbidden.test(key)),
    ),
  };
}

export interface IndicatorSelection {
  readonly code: 'SMA' | 'EMA' | 'BOLLINGER' | 'RSI' | 'MACD' | 'VOLUME';
  readonly period?: number;
}

export function validateIndicators(items: readonly IndicatorSelection[]) {
  if (items.length > 6) throw new Error('INDICATOR_LIMIT_EXCEEDED');
  for (const item of items)
    if (item.period !== undefined && (item.period < 2 || item.period > 500))
      throw new Error('INDICATOR_PERIOD_INVALID');
  return items;
}
