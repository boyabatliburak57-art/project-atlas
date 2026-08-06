import type { OhlcvPoint } from './market-model';

export const dataDisclosure = 'DEMO_UI_FIXTURE · NOT_LIVE_MARKET_DATA';

export const chartSeries: readonly OhlcvPoint[] = Array.from(
  { length: 32 },
  (_, index) => {
    const open = 100 + index * 0.7 + Math.sin(index / 2) * 2;
    const close = open + Math.sin(index) * 1.4;
    return {
      time: new Date(Date.UTC(2026, 6, index + 1, 7)).toISOString(),
      open,
      high: Math.max(open, close) + 1.2,
      low: Math.min(open, close) - 1.1,
      close,
      volume: 1_000_000 + index * 31_000,
    };
  },
);

export const symbolItems = [
  {
    symbol: 'THYAO',
    company: 'Türk Hava Yolları',
    sector: 'Ulaştırma',
    change: 0.0184,
  },
  { symbol: 'ASELS', company: 'Aselsan', sector: 'Teknoloji', change: 0.0092 },
  { symbol: 'TUPRS', company: 'Tüpraş', sector: 'Enerji', change: -0.0117 },
  {
    symbol: 'GARAN',
    company: 'Garanti BBVA',
    sector: 'Banka',
    change: -0.0042,
  },
] as const;
