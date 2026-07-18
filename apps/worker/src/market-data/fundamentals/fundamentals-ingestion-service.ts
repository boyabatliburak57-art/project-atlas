import {
  Decimal,
  FUNDAMENTAL_METRIC_CODES,
  type NormalizedFundamentalStatement,
} from '@atlas/domain';
import type {
  FundamentalsIngestionStore,
  FundamentalsProvider,
  ProviderFundamentalStatement,
} from './contracts';

export class FundamentalsIngestionError extends Error {
  override readonly name = 'FundamentalsIngestionError';
  constructor(
    readonly code:
      | 'FUNDAMENTALS_MAPPING_NOT_FOUND'
      | 'FUNDAMENTALS_CAPABILITY_UNSUPPORTED'
      | 'FUNDAMENTALS_STATEMENT_INVALID',
  ) {
    super(code);
  }
}

export class FundamentalsIngestionService {
  constructor(
    private readonly provider: FundamentalsProvider,
    private readonly store: FundamentalsIngestionStore,
  ) {}

  async execute(providerSymbol: string) {
    const capabilities = this.provider.getCapabilities();
    if (!capabilities.supportsAnnual && !capabilities.supportsQuarterly)
      throw new FundamentalsIngestionError(
        'FUNDAMENTALS_CAPABILITY_UNSUPPORTED',
      );
    const context = await this.store.resolveContext(
      this.provider.code,
      providerSymbol,
    );
    if (!context)
      throw new FundamentalsIngestionError('FUNDAMENTALS_MAPPING_NOT_FOUND');
    const periods = await this.provider.listPeriods(providerSymbol);
    const fetched = await this.provider.fetchStatements(
      providerSymbol,
      periods,
    );
    const normalized = fetched.map((statement) =>
      normalizeStatement(statement, context.instrumentId, this.provider.code),
    );
    return {
      ...(await this.store.persist(normalized, context.providerId)),
      fetchedStatements: fetched.length,
    };
  }
}

export function normalizeStatement(
  statement: ProviderFundamentalStatement,
  instrumentId: string,
  providerCode: string,
): NormalizedFundamentalStatement {
  if (
    statement.periodEnd < statement.periodStart ||
    !/^[A-Z]{3}$/u.test(statement.currencyCode) ||
    !statement.providerRevision.trim()
  )
    throw new FundamentalsIngestionError('FUNDAMENTALS_STATEMENT_INVALID');
  const unit = Decimal.parse(statement.unitScale, 'unitScale');
  if (unit.isZero() || unit.isNegative())
    throw new FundamentalsIngestionError('FUNDAMENTALS_STATEMENT_INVALID');
  const metrics: Partial<
    Record<(typeof FUNDAMENTAL_METRIC_CODES)[number], string>
  > = {};
  for (const code of FUNDAMENTAL_METRIC_CODES) {
    const raw = statement.metrics[code];
    if (raw !== undefined)
      metrics[code] = Decimal.parse(raw, code).times(unit).toString();
  }
  if (
    metrics.freeCashFlow === undefined &&
    metrics.operatingCashFlow !== undefined &&
    metrics.capitalExpenditure !== undefined
  )
    metrics.freeCashFlow = Decimal.parse(metrics.operatingCashFlow)
      .minus(Decimal.parse(metrics.capitalExpenditure))
      .toString();
  return { ...statement, instrumentId, providerCode, metrics, warnings: [] };
}
