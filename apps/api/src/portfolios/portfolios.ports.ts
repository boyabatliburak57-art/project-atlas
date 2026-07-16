import type {
  Portfolio,
  PortfolioApplicationService,
  PortfolioPerformanceSnapshot,
  PortfolioProjection,
  PortfolioRiskSnapshot,
  PortfolioTransaction,
  PortfolioValuationSnapshot,
} from '@atlas/domain';

export const PORTFOLIO_APPLICATION = Symbol('PORTFOLIO_APPLICATION');
export const PORTFOLIO_READ_MODEL = Symbol('PORTFOLIO_READ_MODEL');
export const PORTFOLIO_COMMAND_GUARD = Symbol('PORTFOLIO_COMMAND_GUARD');

export type PortfolioCommands = Pick<
  PortfolioApplicationService,
  | 'list'
  | 'get'
  | 'create'
  | 'update'
  | 'delete'
  | 'restore'
  | 'listTransactions'
  | 'getTransaction'
  | 'createDraft'
  | 'post'
  | 'reverse'
  | 'rebuildProjection'
>;

export interface PortfolioReadModel {
  projection(portfolioId: string): Promise<PortfolioProjection>;
  latestValuation(
    portfolioId: string,
  ): Promise<PortfolioValuationSnapshot | null>;
  valuationHistory(input: {
    readonly portfolioId: string;
    readonly limit: number;
    readonly cursor: ValuationCursor | null;
  }): Promise<{
    readonly items: readonly PortfolioValuationSnapshot[];
    readonly nextCursor: ValuationCursor | null;
  }>;
  latestPerformance(
    portfolioId: string,
  ): Promise<PortfolioPerformanceSnapshot | null>;
  latestRisk(portfolioId: string): Promise<PortfolioRiskSnapshot | null>;
  invalidate(portfolioId: string, ledgerVersion: number): Promise<void>;
}

export interface ValuationCursor {
  readonly valuationAt: string;
  readonly id: string;
}

export interface PortfolioCommandGuard {
  execute<T>(input: {
    readonly userId: string;
    readonly operation: string;
    readonly idempotencyKey: string;
    readonly requestHash: string;
    readonly operationFactory: () => Promise<T>;
  }): Promise<{ readonly value: T; readonly replayed: boolean }>;
  consumeRateLimit(input: {
    readonly userId: string;
    readonly portfolioId: string;
    readonly now: Date;
  }): void;
}

export interface PortfolioListPage {
  readonly items: readonly Portfolio[];
  readonly nextCursor: string | null;
}

export interface TransactionListPage {
  readonly items: readonly PortfolioTransaction[];
  readonly nextCursor: string | null;
}
