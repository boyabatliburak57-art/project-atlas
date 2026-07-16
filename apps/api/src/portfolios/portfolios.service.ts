import { createHash } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  PortfolioError,
  type Portfolio,
  type PortfolioPerformanceSnapshot,
  type PortfolioRiskSnapshot,
  type PortfolioTransaction,
  type PortfolioValuationSnapshot,
} from '@atlas/domain';
import { z } from 'zod';

import type {
  CreatePortfolioDto,
  CreatePortfolioTransactionDto,
  PerformanceQueryDto,
  PortfolioListQueryDto,
  TransactionListQueryDto,
  UpdatePortfolioDto,
  ValuationHistoryQueryDto,
} from './portfolios.dto';
import {
  PORTFOLIO_APPLICATION,
  PORTFOLIO_COMMAND_GUARD,
  PORTFOLIO_READ_MODEL,
  type PortfolioCommandGuard,
  type PortfolioCommands,
  type PortfolioListPage,
  type TransactionListPage,
  type ValuationCursor,
} from './portfolios.ports';

const uuid = z.uuid();
const idempotency = z.string().trim().min(1).max(200);
const decimal = z.string().regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/);
const portfolioCreate = z
  .object({
    name: z.string(),
    description: z.string().nullable().optional(),
    defaultBenchmarkCode: z.string().nullable().optional(),
  })
  .strict();
const portfolioUpdate = portfolioCreate
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    'At least one field is required',
  );
const transactionCreate = z
  .object({
    type: z.enum([
      'buy',
      'sell',
      'cashDeposit',
      'cashWithdrawal',
      'dividend',
      'fee',
      'tax',
      'adjustment',
    ]),
    instrumentId: z.uuid().nullable().optional(),
    tradeAt: z.iso.datetime({ offset: true }),
    settlementAt: z.iso.datetime({ offset: true }).nullable().optional(),
    quantity: decimal.nullable().optional(),
    unitPrice: decimal.nullable().optional(),
    fee: decimal.optional(),
    tax: decimal.optional(),
    cashAmount: decimal.nullable().optional(),
    externalReference: z.string().max(500).nullable().optional(),
    adjustmentReason: z.string().max(1_000).nullable().optional(),
    note: z.string().max(4_000).nullable().optional(),
  })
  .strict();
const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().min(1).max(2_048).optional(),
  includeDeleted: z.enum(['true', 'false']).default('false'),
});
const pageQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().min(1).max(2_048).optional(),
});
const portfolioCursor = z.object({ updatedAt: z.string(), id: z.uuid() });
const transactionCursor = z.object({
  sequence: z.number().int(),
  id: z.uuid(),
});
const valuationCursor = z.object({
  valuationAt: z.iso.datetime({ offset: true }),
  id: z.uuid(),
});
const performanceQuery = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  benchmark: z.string().max(64).optional(),
});

@Injectable()
export class PortfoliosService {
  constructor(
    @Inject(PORTFOLIO_APPLICATION)
    private readonly portfolios: PortfolioCommands,
    @Inject(PORTFOLIO_READ_MODEL)
    private readonly readModel: import('./portfolios.ports').PortfolioReadModel,
    @Inject(PORTFOLIO_COMMAND_GUARD)
    private readonly commands: PortfolioCommandGuard,
  ) {}

  async list(
    userId: string,
    query: PortfolioListQueryDto,
  ): Promise<PortfolioListPage> {
    const parsed = parse(listQuery, query);
    const cursor = parsed.cursor
      ? decodeCursor(parsed.cursor, portfolioCursor)
      : undefined;
    const owned = [
      ...(await this.portfolios.list(userId, parsed.includeDeleted === 'true')),
    ].sort(comparePortfolios);
    const remaining = cursor
      ? owned.filter(
          (item) =>
            item.updatedAt.toISOString() < cursor.updatedAt ||
            (item.updatedAt.toISOString() === cursor.updatedAt &&
              item.id > cursor.id),
        )
      : owned;
    const selected = remaining.slice(0, parsed.limit + 1);
    const hasNext = selected.length > parsed.limit;
    const items = hasNext ? selected.slice(0, parsed.limit) : selected;
    const last = items.at(-1);
    return {
      items,
      nextCursor:
        hasNext && last
          ? encodeCursor({
              updatedAt: last.updatedAt.toISOString(),
              id: last.id,
            })
          : null,
    };
  }

  get(userId: string, rawPortfolioId: string) {
    return this.execute(() =>
      this.portfolios.get(userId, identifier(rawPortfolioId)),
    );
  }

  create(userId: string, body: CreatePortfolioDto) {
    const parsed = parse(portfolioCreate, body);
    return this.execute(() =>
      this.portfolios.create({
        userId,
        name: parsed.name,
        description: parsed.description ?? null,
        defaultBenchmarkCode: parsed.defaultBenchmarkCode ?? null,
      }),
    );
  }

  async update(
    userId: string,
    rawPortfolioId: string,
    body: UpdatePortfolioDto,
  ) {
    const portfolioId = identifier(rawPortfolioId);
    const parsed = parse(portfolioUpdate, body);
    return this.execute(async () => {
      const current = await this.portfolios.get(userId, portfolioId);
      return this.portfolios.update({
        userId,
        portfolioId,
        name: parsed.name ?? current.name,
        description:
          parsed.description === undefined
            ? current.description
            : parsed.description,
        defaultBenchmarkCode:
          parsed.defaultBenchmarkCode === undefined
            ? current.defaultBenchmarkCode
            : parsed.defaultBenchmarkCode,
      });
    });
  }

  delete(userId: string, rawPortfolioId: string) {
    return this.execute(() =>
      this.portfolios.delete(userId, identifier(rawPortfolioId)),
    );
  }

  restore(userId: string, rawPortfolioId: string) {
    return this.execute(() =>
      this.portfolios.restore(userId, identifier(rawPortfolioId)),
    );
  }

  async listTransactions(
    userId: string,
    rawPortfolioId: string,
    query: TransactionListQueryDto,
  ): Promise<TransactionListPage> {
    const portfolioId = identifier(rawPortfolioId);
    const parsed = parse(pageQuery, query);
    const cursor = parsed.cursor
      ? decodeCursor(parsed.cursor, transactionCursor)
      : undefined;
    const transactions = [
      ...(await this.execute(() =>
        this.portfolios.listTransactions(userId, portfolioId),
      )),
    ].sort(compareTransactions);
    const remaining = cursor
      ? transactions.filter(
          (item) =>
            item.sequence > cursor.sequence ||
            (item.sequence === cursor.sequence && item.id > cursor.id),
        )
      : transactions;
    const selected = remaining.slice(0, parsed.limit + 1);
    const hasNext = selected.length > parsed.limit;
    const items = hasNext ? selected.slice(0, parsed.limit) : selected;
    const last = items.at(-1);
    return {
      items,
      nextCursor:
        hasNext && last
          ? encodeCursor({ sequence: last.sequence, id: last.id })
          : null,
    };
  }

  transaction(
    userId: string,
    rawPortfolioId: string,
    rawTransactionId: string,
  ) {
    return this.execute(() =>
      this.portfolios.getTransaction(
        userId,
        identifier(rawPortfolioId),
        identifier(rawTransactionId),
      ),
    );
  }

  async createTransaction(
    userId: string,
    rawPortfolioId: string,
    rawKey: string | undefined,
    body: CreatePortfolioTransactionDto,
  ) {
    const portfolioId = identifier(rawPortfolioId);
    const key = requiredKey(rawKey);
    const parsed = parse(transactionCreate, body);
    return this.execute(() =>
      this.portfolios.createDraft({
        userId,
        portfolioId,
        idempotencyKey: key,
        source: 'manual',
        type: parsed.type,
        instrumentId: parsed.instrumentId ?? null,
        tradeAt: new Date(parsed.tradeAt),
        settlementAt: parsed.settlementAt
          ? new Date(parsed.settlementAt)
          : null,
        quantity: parsed.quantity ?? null,
        unitPrice: parsed.unitPrice ?? null,
        fee: parsed.fee ?? '0',
        tax: parsed.tax ?? '0',
        cashAmount: parsed.cashAmount ?? null,
        externalReference: parsed.externalReference ?? null,
        adjustmentReason: parsed.adjustmentReason ?? null,
        note: parsed.note ?? null,
      }),
    );
  }

  post(
    userId: string,
    rawPortfolioId: string,
    rawTransactionId: string,
    rawKey?: string,
  ) {
    const portfolioId = identifier(rawPortfolioId);
    const transactionId = identifier(rawTransactionId);
    return this.guarded(
      userId,
      'transaction.post',
      requiredKey(rawKey),
      {
        portfolioId,
        transactionId,
      },
      () => this.portfolios.post(userId, portfolioId, transactionId),
    );
  }

  reverse(
    userId: string,
    rawPortfolioId: string,
    rawTransactionId: string,
    rawKey?: string,
  ) {
    const portfolioId = identifier(rawPortfolioId);
    const transactionId = identifier(rawTransactionId);
    const key = requiredKey(rawKey);
    return this.guarded(
      userId,
      'transaction.reverse',
      key,
      {
        portfolioId,
        transactionId,
      },
      () => this.portfolios.reverse(userId, portfolioId, transactionId, key),
    );
  }

  async positions(userId: string, rawPortfolioId: string) {
    const portfolioId = identifier(rawPortfolioId);
    await this.owned(userId, portfolioId);
    return (await this.readModel.projection(portfolioId)).positions;
  }

  async valuation(userId: string, rawPortfolioId: string) {
    const portfolioId = identifier(rawPortfolioId);
    await this.owned(userId, portfolioId);
    const value = await this.readModel.latestValuation(portfolioId);
    if (!value) throw analyticsNotFound('PORTFOLIO_VALUATION_NOT_FOUND');
    return value;
  }

  async valuationHistory(
    userId: string,
    rawPortfolioId: string,
    query: ValuationHistoryQueryDto,
  ) {
    const portfolioId = identifier(rawPortfolioId);
    await this.owned(userId, portfolioId);
    const parsed = parse(pageQuery, query);
    const cursor: ValuationCursor | null = parsed.cursor
      ? decodeCursor(parsed.cursor, valuationCursor)
      : null;
    const result = await this.readModel.valuationHistory({
      portfolioId,
      limit: parsed.limit,
      cursor,
    });
    return {
      items: result.items,
      nextCursor: result.nextCursor ? encodeCursor(result.nextCursor) : null,
    };
  }

  async performance(
    userId: string,
    rawPortfolioId: string,
    query: PerformanceQueryDto,
  ) {
    const portfolioId = identifier(rawPortfolioId);
    parse(performanceQuery, query);
    await this.owned(userId, portfolioId);
    const value = await this.readModel.latestPerformance(portfolioId);
    if (!value) throw analyticsNotFound('PORTFOLIO_PERFORMANCE_NOT_FOUND');
    return value;
  }

  async risk(userId: string, rawPortfolioId: string) {
    const portfolioId = identifier(rawPortfolioId);
    await this.owned(userId, portfolioId);
    const value = await this.readModel.latestRisk(portfolioId);
    if (!value) throw analyticsNotFound('PORTFOLIO_RISK_NOT_FOUND');
    return value;
  }

  recalculate(userId: string, rawPortfolioId: string, rawKey?: string) {
    const portfolioId = identifier(rawPortfolioId);
    const key = requiredKey(rawKey);
    return this.guarded(
      userId,
      'portfolio.recalculate',
      key,
      { portfolioId },
      async () => {
        this.commands.consumeRateLimit({
          userId,
          portfolioId,
          now: new Date(),
        });
        const projection = await this.portfolios.rebuildProjection(
          userId,
          portfolioId,
        );
        await this.readModel.invalidate(portfolioId, projection.ledgerVersion);
        return {
          portfolioId,
          ledgerVersion: projection.ledgerVersion,
          status: 'completed' as const,
        };
      },
    );
  }

  private owned(userId: string, portfolioId: string): Promise<Portfolio> {
    return this.execute(() => this.portfolios.get(userId, portfolioId));
  }

  private guarded<T>(
    userId: string,
    operation: string,
    idempotencyKey: string,
    request: unknown,
    operationFactory: () => Promise<T>,
  ) {
    return this.execute(() =>
      this.commands.execute({
        userId,
        operation,
        idempotencyKey,
        requestHash: hash(request),
        operationFactory,
      }),
    );
  }

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof PortfolioError) throw mapPortfolioError(error);
      throw error;
    }
  }
}

export function portfolioDto(portfolio: Portfolio) {
  return {
    ...portfolio,
    createdAt: portfolio.createdAt.toISOString(),
    updatedAt: portfolio.updatedAt.toISOString(),
    deletedAt: portfolio.deletedAt?.toISOString() ?? null,
  };
}

export function transactionDto(transaction: PortfolioTransaction) {
  return {
    id: transaction.id,
    portfolioId: transaction.portfolioId,
    instrumentId: transaction.instrumentId,
    reversalOfTransactionId: transaction.reversalOfTransactionId,
    sequence: transaction.sequence,
    type: transaction.type,
    status: transaction.status,
    tradeAt: transaction.tradeAt.toISOString(),
    settlementAt: transaction.settlementAt?.toISOString() ?? null,
    quantity: transaction.quantity,
    unitPrice: transaction.unitPrice,
    fee: transaction.fee,
    tax: transaction.tax,
    cashAmount: transaction.cashAmount,
    source: transaction.source,
    externalReference: transaction.externalReference,
    adjustmentReason: transaction.adjustmentReason,
    note: transaction.note,
    postedAt: transaction.postedAt?.toISOString() ?? null,
    reversedAt: transaction.reversedAt?.toISOString() ?? null,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
}

export function analyticsDto<
  T extends
    | PortfolioValuationSnapshot
    | PortfolioPerformanceSnapshot
    | PortfolioRiskSnapshot,
>(value: T): unknown {
  return serialize(value);
}

function serialize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === 'object' && value !== null)
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serialize(item)]),
    );
  if (typeof value === 'number' && !Number.isFinite(value))
    throw new Error('Non-finite portfolio API output');
  return value;
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new BadRequestException({
      code: 'PORTFOLIO_INVALID',
      message: 'Invalid portfolio request',
      details: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        reason: issue.message,
      })),
    });
  return result.data;
}

function identifier(value: string): string {
  return parse(uuid, value);
}

function requiredKey(value?: string): string {
  const result = idempotency.safeParse(value);
  if (!result.success)
    throw new BadRequestException({
      code: 'PORTFOLIO_IDEMPOTENCY_KEY_REQUIRED',
      message: 'Idempotency-Key header is required',
    });
  return result.data;
}

function hash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function encodeCursor(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeCursor<T>(value: string, schema: z.ZodType<T>): T {
  try {
    return schema.parse(
      JSON.parse(Buffer.from(value, 'base64url').toString('utf8')),
    );
  } catch {
    throw new BadRequestException({
      code: 'PORTFOLIO_CURSOR_INVALID',
      message: 'Invalid portfolio cursor',
    });
  }
}

function comparePortfolios(left: Portfolio, right: Portfolio): number {
  return (
    right.updatedAt.getTime() - left.updatedAt.getTime() ||
    left.id.localeCompare(right.id)
  );
}

function compareTransactions(
  left: PortfolioTransaction,
  right: PortfolioTransaction,
): number {
  return left.sequence - right.sequence || left.id.localeCompare(right.id);
}

function analyticsNotFound(code: string) {
  return new NotFoundException({
    code,
    message: 'Portfolio analytics are not available',
  });
}

function mapPortfolioError(error: PortfolioError): HttpException {
  const payload = {
    code: error.code,
    message: errorMessage(error.code),
    ...(error.details === undefined ? {} : { details: error.details }),
  };
  if (
    ['PORTFOLIO_NOT_FOUND', 'PORTFOLIO_TRANSACTION_NOT_FOUND'].includes(
      error.code,
    )
  )
    return new NotFoundException(payload);
  if (
    ['PORTFOLIO_ACCESS_DENIED', 'PORTFOLIO_TRANSACTION_ACCESS_DENIED'].includes(
      error.code,
    )
  )
    return new ForbiddenException(payload);
  if (
    [
      'PORTFOLIO_IDEMPOTENCY_CONFLICT',
      'PORTFOLIO_CONFLICT',
      'PORTFOLIO_DELETED',
      'PORTFOLIO_TRANSACTION_IMMUTABLE',
      'PORTFOLIO_TRANSACTION_INVALID_STATE',
      'PORTFOLIO_ALREADY_REVERSED',
    ].includes(error.code)
  )
    return new ConflictException(payload);
  if (error.code === 'PORTFOLIO_INSUFFICIENT_POSITION')
    return new UnprocessableEntityException(payload);
  if (error.code === 'PORTFOLIO_RECALCULATE_RATE_LIMITED')
    return new HttpException(payload, HttpStatus.TOO_MANY_REQUESTS);
  if (error.code === 'PORTFOLIO_IDEMPOTENCY_KEY_REQUIRED')
    return new BadRequestException(payload);
  return new BadRequestException(payload);
}

function errorMessage(code: string): string {
  return (
    (
      {
        PORTFOLIO_NOT_FOUND: 'Portfolio was not found',
        PORTFOLIO_ACCESS_DENIED: 'Access to portfolio was denied',
        PORTFOLIO_DELETED: 'Deleted portfolio cannot accept this operation',
        PORTFOLIO_CONFLICT: 'Portfolio update conflict',
        PORTFOLIO_INVALID: 'Invalid portfolio request',
        PORTFOLIO_TRANSACTION_NOT_FOUND: 'Portfolio transaction was not found',
        PORTFOLIO_TRANSACTION_ACCESS_DENIED:
          'Access to portfolio transaction was denied',
        PORTFOLIO_TRANSACTION_IMMUTABLE: 'Posted transaction is immutable',
        PORTFOLIO_TRANSACTION_INVALID_STATE:
          'Transaction state does not allow this operation',
        PORTFOLIO_TRANSACTION_INVALID: 'Invalid portfolio transaction',
        PORTFOLIO_INSUFFICIENT_POSITION:
          'Transaction quantity exceeds the current position',
        PORTFOLIO_IDEMPOTENCY_KEY_REQUIRED:
          'Idempotency-Key header is required',
        PORTFOLIO_IDEMPOTENCY_CONFLICT:
          'Idempotency key was reused for a different request',
        PORTFOLIO_ALREADY_REVERSED: 'Transaction was already reversed',
        PORTFOLIO_RECALCULATE_RATE_LIMITED:
          'Portfolio recalculation rate limit was exceeded',
      } as Record<string, string>
    )[code] ?? 'Portfolio request could not be processed'
  );
}
