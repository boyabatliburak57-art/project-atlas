export const surfaceContextLabel =
  'DEMO_UI_FIXTURE · TEST_ONLY · NOT_USER_DATA';
export const reportCards = [
  {
    title: 'Portföy özeti',
    type: 'PORTFOLIO_SUMMARY',
    status: 'ready',
    cutoff: '8 Ağu · 18:10',
  },
  {
    title: 'Scanner koşum raporu',
    type: 'SCANNER_RUN',
    status: 'generating',
    cutoff: '8 Ağu · 17:45',
  },
  {
    title: 'Backtest sonucu',
    type: 'BACKTEST_RESULT',
    status: 'partial',
    cutoff: '31 Tem · 18:10',
  },
] as const;
export const helpCategories = [
  'Başlangıç',
  'Piyasa verisi',
  'Scanner',
  'Portföy',
  'Strategy Lab',
  'Raporlar',
  'Gizlilik',
] as const;
export const supportRows = [
  {
    code: 'SUP-8F42A1',
    subject: 'Veri kesim zamanı',
    status: 'inProgress',
    date: '8 Ağu',
  },
  {
    code: 'SUP-41C902',
    subject: 'Rapor indirme',
    status: 'resolved',
    date: '6 Ağu',
  },
] as const;
