import type {
  FundamentalsProvider,
  FundamentalsProviderCapabilities,
  ProviderFundamentalPeriod,
  ProviderFundamentalStatement,
} from './contracts';

export class FakeFundamentalsProvider implements FundamentalsProvider {
  readonly listRequests: string[] = [];
  readonly fetchRequests: {
    symbol: string;
    periods: readonly ProviderFundamentalPeriod[];
  }[] = [];
  private failures: Error[] = [];

  constructor(
    readonly code: string,
    private readonly capabilities: FundamentalsProviderCapabilities,
    private readonly statements: readonly ProviderFundamentalStatement[],
  ) {}

  failNext(error: Error) {
    this.failures.push(error);
  }
  getCapabilities() {
    return this.capabilities;
  }
  listPeriods(providerSymbol: string) {
    this.throwFailure();
    this.listRequests.push(providerSymbol);
    return Promise.resolve(
      this.statements
        .filter((item) => item.providerSymbol === providerSymbol)
        .map(
          ({
            fiscalYear,
            fiscalPeriod,
            periodType,
            periodStart,
            periodEnd,
          }) => ({
            fiscalYear,
            fiscalPeriod,
            periodType,
            periodStart,
            periodEnd,
          }),
        ),
    );
  }
  fetchStatements(
    providerSymbol: string,
    periods: readonly ProviderFundamentalPeriod[],
  ) {
    this.throwFailure();
    this.fetchRequests.push({ symbol: providerSymbol, periods });
    const identities = new Set(
      periods.map((item) => `${item.fiscalYear}:${item.fiscalPeriod}`),
    );
    return Promise.resolve(
      this.statements.filter(
        (item) =>
          item.providerSymbol === providerSymbol &&
          identities.has(`${item.fiscalYear}:${item.fiscalPeriod}`),
      ),
    );
  }
  private throwFailure() {
    const error = this.failures.shift();
    if (error) throw error;
  }
}
