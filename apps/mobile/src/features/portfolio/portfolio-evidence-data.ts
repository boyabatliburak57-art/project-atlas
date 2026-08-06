export const environmentNotice =
  'DEMO_UI_FIXTURE · NOT_LIVE_MARKET_DATA · TEST_ONLY';
export const portfolios = [
  {
    id: 'core',
    name: 'Uzun Vadeli',
    currency: 'TRY',
    positions: 3,
    demo: false,
  },
  { id: 'demo', name: 'Atlas Demo', currency: 'TRY', positions: 4, demo: true },
] as const;
export const positions = [
  {
    id: 'p1',
    symbol: 'THYAO',
    company: 'Türk Hava Yolları',
    quantity: '120',
    averageCost: '281,40',
    pnl: '+₺4.824',
    weight: '%31,2',
  },
  {
    id: 'p2',
    symbol: 'ASELS',
    company: 'Aselsan',
    quantity: '80',
    averageCost: '63,15',
    pnl: '+₺1.288',
    weight: '%22,8',
  },
  {
    id: 'p3',
    symbol: 'TUPRS',
    company: 'Tüpraş',
    quantity: '45',
    averageCost: '164,20',
    pnl: '−₺720',
    weight: '%18,4',
  },
] as const;
export const transactions = [
  {
    id: 't1',
    type: 'BUY',
    label: 'THYAO · Alış kaydı',
    amount: '120 × ₺281,40',
    status: 'posted',
  },
  {
    id: 't2',
    type: 'DIVIDEND',
    label: 'TUPRS · Temettü kaydı',
    amount: '₺1.240,00',
    status: 'manual',
  },
  {
    id: 't3',
    type: 'CASH_DEPOSIT',
    label: 'Nakit yatırma kaydı',
    amount: '₺25.000,00',
    status: 'posted',
  },
] as const;
