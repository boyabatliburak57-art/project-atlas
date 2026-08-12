export const evidenceLabel =
  'DEMO_UI_FIXTURE · NOT_LIVE_OR_PRODUCTION_MARKET_DATA';
export const strategyCards = [
  {
    name: 'Trend ve hacim araştırması',
    revision: 4,
    universe: 'BIST 100',
    rules: 6,
    status: 'ready',
  },
  {
    name: 'Düşük volatilite incelemesi',
    revision: 2,
    universe: 'BIST 30',
    rules: 4,
    status: 'providerRequired',
  },
] as const;
export const metricRows = [
  ['Toplam getiri', '+%18,40'],
  ['Yıllıklandırılmış getiri', '+%12,16'],
  ['Yıllık volatilite', '%16,82'],
  ['Sharpe', '0,72'],
  ['Sortino', '1,08'],
  ['Maksimum drawdown', '-%9,31'],
  ['Calmar', '1,31'],
  ['Expectancy', '₺184,20'],
  ['Turnover', '1,84x'],
  ['İşlem sayısı', '42'],
  ['Komisyon', '₺1.248,00'],
  ['Slippage', '₺612,00'],
] as const;
export const tradeRows = [
  {
    id: 't1',
    symbol: 'THYAO',
    entry: '12 Oca',
    exit: '28 Oca',
    result: '+%6,2',
  },
  {
    id: 't2',
    symbol: 'ASELS',
    entry: '03 Şub',
    exit: '17 Şub',
    result: '-%2,1',
  },
  {
    id: 't3',
    symbol: 'BIMAS',
    entry: '11 Mar',
    exit: '02 Nis',
    result: '+%4,8',
  },
] as const;
