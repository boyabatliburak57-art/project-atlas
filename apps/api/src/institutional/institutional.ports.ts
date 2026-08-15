export const INSTITUTIONAL_READER = Symbol('INSTITUTIONAL_READER');

export interface InstitutionalReader {
  searchInstitutions(
    query: string,
    limit: number,
  ): Promise<readonly Record<string, unknown>[]>;
  overview(input: {
    readonly from: string;
    readonly to: string;
    readonly limit: number;
    readonly tradingSessionLimit: 1 | 5 | 20 | null;
  }): Promise<{
    readonly topBuyers: readonly Record<string, unknown>[];
    readonly topSellers: readonly Record<string, unknown>[];
  }>;
  instrumentFlow(input: {
    readonly symbol: string;
    readonly from: string;
    readonly to: string;
    readonly sort: 'NET_BUY' | 'NET_SELL' | 'BUY_VALUE' | 'SELL_VALUE';
    readonly limit: number;
    readonly afterInstitutionId: string | null;
    readonly tradingSessionLimit: 1 | 5 | 20 | null;
  }): Promise<readonly Record<string, unknown>[]>;
  institution(id: string): Promise<Record<string, unknown> | null>;
  institutionFlows(input: {
    readonly institutionId: string;
    readonly from: string;
    readonly to: string;
    readonly limit: number;
    readonly tradingSessionLimit: 1 | 5 | 20 | null;
  }): Promise<readonly Record<string, unknown>[]>;
  settlement(input: {
    readonly symbol: string;
    readonly settlementDate: string | null;
    readonly sort: 'HOLDING' | 'INCREASE' | 'DECREASE';
    readonly limit: number;
    readonly residency: 'FOREIGN' | null;
  }): Promise<readonly Record<string, unknown>[]>;
  institutionHoldings(input: {
    readonly institutionId: string;
    readonly settlementDate: string | null;
    readonly limit: number;
  }): Promise<readonly Record<string, unknown>[]>;
  settlementHistory(input: {
    readonly symbol: string;
    readonly from: string;
    readonly to: string;
    readonly institutionId: string | null;
    readonly limit: number;
  }): Promise<readonly Record<string, unknown>[]>;
  capability(
    capability:
      | 'institutional.akd'
      | 'settlement.snapshot'
      | 'settlement.foreign',
  ): Promise<{
    readonly availability: string;
    readonly health: string;
    readonly checkedAt: Date | null;
  }>;
}
