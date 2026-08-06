import { describe, expect, it } from 'vitest';
import { chartSeries } from './market-evidence-data';
import {
  RecentSearches,
  breadthPercent,
  canSearch,
  isAllowedCompanyUrl,
  normalizeSearchQuery,
  redactMarketTelemetry,
  safeSharePayload,
  summarizeChart,
  validateIndicators,
  validateOhlcv,
} from './market-model';

describe('TASK-100E market contracts', () => {
  it('normalizes Unicode and bounds search', () => {
    expect(normalizeSearchQuery('  Türk   Hava  ')).toBe('Türk Hava');
    expect(normalizeSearchQuery('x'.repeat(100))).toHaveLength(80);
  });
  it('blocks empty and single-character search', () => {
    expect(canSearch('')).toBe(false);
    expect(canSearch('T')).toBe(false);
    expect(canSearch('TH')).toBe(true);
  });
  it('calculates breadth only over evaluated instruments', () => {
    expect(breadthPercent(30, 10, 10)).toBe(60);
    expect(breadthPercent(0, 0, 0)).toBeNull();
  });
  it('accepts valid ordered OHLCV', () => {
    expect(validateOhlcv(chartSeries)).toHaveLength(32);
  });
  it('rejects duplicate timestamps', () => {
    expect(() => validateOhlcv([chartSeries[0]!, chartSeries[0]!])).toThrow(
      'CHART_TIME_AXIS_INVALID',
    );
  });
  it('rejects unsorted timestamps', () => {
    expect(() => validateOhlcv([chartSeries[1]!, chartSeries[0]!])).toThrow(
      'CHART_TIME_AXIS_INVALID',
    );
  });
  it('rejects invalid high/low invariants', () => {
    expect(() => validateOhlcv([{ ...chartSeries[0]!, high: 1 }])).toThrow(
      'CHART_OHLC_INVARIANT_INVALID',
    );
  });
  it('does not interpolate missing sessions', () => {
    const subset = [chartSeries[0]!, chartSeries[4]!];
    expect(validateOhlcv(subset)).toEqual(subset);
  });
  it('summarizes chart accessibly', () => {
    const summary = summarizeChart(chartSeries);
    expect(summary?.pointCount).toBe(32);
    expect(summary!.highest).toBeGreaterThanOrEqual(summary!.last);
  });
  it('returns null for empty charts rather than zero', () => {
    expect(summarizeChart([])).toBeNull();
  });
  it('validates indicator limit', () => {
    expect(() =>
      validateIndicators([
        { code: 'SMA' },
        { code: 'EMA' },
        { code: 'BOLLINGER' },
        { code: 'RSI' },
        { code: 'MACD' },
        { code: 'VOLUME' },
        { code: 'SMA', period: 50 },
      ]),
    ).toThrow('INDICATOR_LIMIT_EXCEEDED');
  });
  it('rejects invalid indicator periods', () => {
    expect(() => validateIndicators([{ code: 'SMA', period: 1 }])).toThrow(
      'INDICATOR_PERIOD_INVALID',
    );
  });
  it('accepts backend-compatible overlays', () => {
    expect(
      validateIndicators([{ code: 'SMA', period: 20 }, { code: 'MACD' }]),
    ).toHaveLength(2);
  });
  it('builds a safe share payload without price or user data', () => {
    const payload = safeSharePayload({
      symbol: 'THYAO',
      company: 'Türk Hava Yolları',
      deepLink: 'atlas://symbol/THYAO',
    });
    expect(payload).toContain('atlas://symbol/THYAO');
    expect(payload).not.toMatch(/token|portfolio/iu);
  });
  it('rejects arbitrary share URLs', () => {
    expect(() =>
      safeSharePayload({
        symbol: 'THYAO',
        company: 'THY',
        deepLink: 'https://evil.test',
      }),
    ).toThrow('SHARE_LINK_NOT_ALLOWED');
  });
  it('allows only credential-free HTTPS company URLs', () => {
    expect(isAllowedCompanyUrl('https://example.com')).toBe(true);
    expect(isAllowedCompanyUrl('http://example.com')).toBe(false);
    expect(isAllowedCompanyUrl('https://u:p@example.com')).toBe(false);
  });
  it('bounds and collapses recent searches', () => {
    const recent = new RecentSearches(2);
    recent.add('THYAO', '2026-01-01T00:00:00Z');
    recent.add('ASELS', '2026-01-02T00:00:00Z');
    recent.add('THYAO', '2026-01-03T00:00:00Z');
    expect(recent.list().map((item) => item.label)).toEqual(['THYAO', 'ASELS']);
  });
  it('clears recent searches for logout/user switch', () => {
    const recent = new RecentSearches();
    recent.add('THYAO');
    recent.clear();
    expect(recent.list()).toEqual([]);
  });
  it('redacts raw search and identity telemetry', () => {
    expect(
      redactMarketTelemetry('symbol_search_started', {
        query: 'THYAO',
        userId: '1',
        resultCount: 2,
      }),
    ).toEqual({
      event: 'symbol_search_started',
      attributes: { resultCount: 2 },
    });
  });
  it('keeps fixture explicitly non-live', () => {
    expect(chartSeries.every((point) => Number.isFinite(point.close))).toBe(
      true,
    );
  });
});
