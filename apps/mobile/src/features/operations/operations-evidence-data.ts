export const environmentNotice =
  'DEMO_UI_FIXTURE · NOT_LIVE_MARKET_DATA · TEST_ONLY';
export const savedScans = [
  {
    id: 'momentum',
    name: 'Momentum takibi',
    revision: 4,
    conditions: 3,
    status: 'completed',
  },
  {
    id: 'volume',
    name: 'Hacim anomalisi',
    revision: 2,
    conditions: 2,
    status: 'providerRequired',
  },
] as const;
export const scanResults = [
  {
    symbol: 'THYAO',
    company: 'Türk Hava Yolları',
    reason: 'RSI(14): 62,4 · Close above SMA(200)',
  },
  {
    symbol: 'ASELS',
    company: 'Aselsan',
    reason: 'Volume above 20-day average',
  },
] as const;
export const watchlistSymbols = [
  { symbol: 'THYAO', company: 'Türk Hava Yolları' },
  { symbol: 'ASELS', company: 'Aselsan' },
  { symbol: 'TUPRS', company: 'Tüpraş' },
] as const;
export const alertItems = [
  { id: 'price', title: 'THYAO fiyat eşiği', type: 'PRICE', state: 'active' },
  {
    id: 'indicator',
    title: 'ASELS RSI',
    type: 'INDICATOR',
    state: 'triggered',
  },
  {
    id: 'scan',
    title: 'Momentum yeni eşleşme',
    type: 'SAVED_SCAN',
    state: 'providerRequired',
  },
] as const;
