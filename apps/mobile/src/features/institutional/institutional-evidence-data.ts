import type {
  InstitutionSummary,
  InstitutionalFlowRow,
  SettlementRow,
} from './institutional-api';

export const institutionalFixturesEnabledAtCompileTime = true;
export const institutionalFixtureLabel =
  'TEST_ONLY_INSTITUTIONAL_CONTRACT_FIXTURE_NOT_LIVE';
export const institutions: readonly InstitutionSummary[] = [
  {
    id: '31000000-0000-4000-8000-000000000001',
    canonicalName: 'Atlas Test Yatırım',
    shortName: 'Atlas Test',
    code: 'ATY',
    type: 'BROKERAGE',
    active: true,
  },
  {
    id: '31000000-0000-4000-8000-000000000002',
    canonicalName: 'Örnek Menkul Değerler',
    shortName: 'Örnek MD',
    code: 'OMD',
    type: 'BROKERAGE',
    active: true,
  },
  {
    id: '31000000-0000-4000-8000-000000000003',
    canonicalName: 'Model Saklama Kuruluşu',
    shortName: 'Model',
    code: 'MSK',
    type: 'CUSTODIAN',
    active: true,
  },
];
export const flowRows: readonly InstitutionalFlowRow[] = [
  {
    institutionId: institutions[0]!.id,
    institutionName: institutions[0]!.canonicalName,
    code: 'ATY',
    buyValue: '184000000',
    sellValue: '59600000',
    netValue: '124400000',
    tradeDate: '2026-08-13',
    availableAt: '2026-08-13T18:10:00Z',
  },
  {
    institutionId: institutions[1]!.id,
    institutionName: institutions[1]!.canonicalName,
    code: 'OMD',
    buyValue: '42800000',
    sellValue: '120900000',
    netValue: '-78100000',
    tradeDate: '2026-08-13',
    availableAt: '2026-08-13T18:10:00Z',
  },
  {
    institutionId: institutions[2]!.id,
    institutionName: institutions[2]!.canonicalName,
    code: 'MSK',
    buyValue: null,
    sellValue: '19200000',
    netValue: null,
    tradeDate: '2026-08-13',
    availableAt: '2026-08-13T18:10:00Z',
  },
];
export const settlementRows: readonly SettlementRow[] = [
  {
    institutionId: institutions[2]!.id,
    institutionName: institutions[2]!.canonicalName,
    code: 'MSK',
    settlementDate: '2026-08-15',
    tradeDate: '2026-08-13',
    holdingQuantity: '28500000',
    holdingRatio: '0.285',
    changeQuantity: '840000',
    changeRatio: '0.0084',
    residency: 'DOMESTIC',
    availableAt: '2026-08-15T18:30:00Z',
  },
  {
    institutionId: institutions[0]!.id,
    institutionName: institutions[0]!.canonicalName,
    code: 'ATY',
    settlementDate: '2026-08-15',
    tradeDate: '2026-08-13',
    holdingQuantity: '21300000',
    holdingRatio: '0.213',
    changeQuantity: '-310000',
    changeRatio: '-0.0031',
    residency: 'FOREIGN',
    availableAt: '2026-08-15T18:30:00Z',
  },
  {
    institutionId: institutions[1]!.id,
    institutionName: institutions[1]!.canonicalName,
    code: 'OMD',
    settlementDate: '2026-08-15',
    tradeDate: '2026-08-13',
    holdingQuantity: '14600000',
    holdingRatio: null,
    changeQuantity: null,
    changeRatio: null,
    residency: 'UNKNOWN',
    availableAt: '2026-08-15T18:30:00Z',
  },
];
