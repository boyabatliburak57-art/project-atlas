import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PortfolioListQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  limit?: string;
  @ApiPropertyOptional({ description: 'Opaque pagination cursor' })
  cursor?: string;
  @ApiPropertyOptional({ enum: ['true', 'false'], default: 'false' })
  includeDeleted?: string;
}

export class TransactionListQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  limit?: string;
  @ApiPropertyOptional({ description: 'Opaque pagination cursor' })
  cursor?: string;
}

export class ValuationHistoryQueryDto extends TransactionListQueryDto {}

export class PortfolioPositionsQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  limit?: string;
  @ApiPropertyOptional({ description: 'Versioned opaque keyset cursor' })
  cursor?: string;
  @ApiPropertyOptional({
    enum: ['symbol', 'marketValue', 'weight', 'unrealizedPnl', 'dailyChange'],
    default: 'symbol',
  })
  sortField?: string;
  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  sortDirection?: string;
  @ApiPropertyOptional({
    maxLength: 32,
    description: 'Normalized symbol prefix filter',
  })
  symbol?: string;
}

export class PerformanceQueryDto {
  @ApiPropertyOptional({ format: 'date', description: 'Inclusive range start' })
  from?: string;
  @ApiPropertyOptional({ format: 'date', description: 'Inclusive range end' })
  to?: string;
  @ApiPropertyOptional({ maxLength: 64 })
  benchmark?: string;
}

export class CreatePortfolioDto {
  @ApiProperty({ maxLength: 200 })
  name!: string;
  @ApiPropertyOptional({ maxLength: 4_000, nullable: true })
  description?: string | null;
  @ApiPropertyOptional({ maxLength: 100, nullable: true })
  defaultBenchmarkCode?: string | null;
}

export class UpdatePortfolioDto {
  @ApiPropertyOptional({ maxLength: 200 })
  name?: string;
  @ApiPropertyOptional({ maxLength: 4_000, nullable: true })
  description?: string | null;
  @ApiPropertyOptional({ maxLength: 100, nullable: true })
  defaultBenchmarkCode?: string | null;
}

export class CreatePortfolioTransactionDto {
  @ApiProperty({
    enum: [
      'buy',
      'sell',
      'cashDeposit',
      'cashWithdrawal',
      'dividend',
      'fee',
      'tax',
      'adjustment',
    ],
  })
  type!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  instrumentId?: string | null;
  @ApiProperty({ format: 'date-time' })
  tradeAt!: string;
  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  settlementAt?: string | null;
  @ApiPropertyOptional({ type: String, example: '12.500000000000' })
  quantity?: string | null;
  @ApiPropertyOptional({ type: String, example: '123.4500000000' })
  unitPrice?: string | null;
  @ApiPropertyOptional({ type: String, default: '0' })
  fee?: string;
  @ApiPropertyOptional({ type: String, default: '0' })
  tax?: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  cashAmount?: string | null;
  @ApiPropertyOptional({ maxLength: 200, nullable: true })
  externalReference?: string | null;
  @ApiPropertyOptional({ maxLength: 1_000, nullable: true })
  adjustmentReason?: string | null;
  @ApiPropertyOptional({ maxLength: 4_000, nullable: true })
  note?: string | null;
}

export class PortfolioDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) userId!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ enum: ['TRY'] }) reportingCurrency!: 'TRY';
  @ApiPropertyOptional({ nullable: true })
  defaultBenchmarkCode!: string | null;
  @ApiProperty({ enum: ['active', 'archived', 'deleted'] }) status!: string;
  @ApiProperty({ minimum: 0 }) ledgerVersion!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  deletedAt!: string | null;
}

export class PortfolioTransactionDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) portfolioId!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  instrumentId!: string | null;
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  reversalOfTransactionId!: string | null;
  @ApiProperty() sequence!: number;
  @ApiProperty() type!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ format: 'date-time' }) tradeAt!: string;
  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  settlementAt!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) quantity!:
    | string
    | null;
  @ApiPropertyOptional({ type: String, nullable: true }) unitPrice!:
    | string
    | null;
  @ApiProperty({ type: String }) fee!: string;
  @ApiProperty({ type: String }) tax!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) cashAmount!:
    | string
    | null;
  @ApiProperty() source!: string;
  @ApiPropertyOptional({ nullable: true }) externalReference!: string | null;
  @ApiPropertyOptional({ nullable: true }) adjustmentReason!: string | null;
  @ApiPropertyOptional({ nullable: true }) note!: string | null;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) postedAt!:
    | string
    | null;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) reversedAt!:
    | string
    | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class PortfolioResponseDto {
  @ApiProperty({ type: PortfolioDto }) data!: PortfolioDto;
  @ApiProperty({ type: Object }) meta!: Record<string, unknown>;
}

export class PortfolioListResponseDto {
  @ApiProperty({ type: Object }) data!: { items: PortfolioDto[] };
  @ApiProperty({ type: Object }) meta!: Record<string, unknown>;
}

export class TransactionResponseDto {
  @ApiProperty({ type: PortfolioTransactionDto })
  data!: PortfolioTransactionDto;
  @ApiProperty({ type: Object }) meta!: Record<string, unknown>;
}

export class TransactionListResponseDto {
  @ApiProperty({ type: Object }) data!: { items: PortfolioTransactionDto[] };
  @ApiProperty({ type: Object }) meta!: Record<string, unknown>;
}

export class PortfolioAnalyticsResponseDto {
  @ApiProperty({ type: Object }) data!: Record<string, unknown>;
  @ApiProperty({ type: Object }) meta!: Record<string, unknown>;
}

export class PortfolioPositionsResponseDto {
  @ApiProperty({ type: Object }) data!: { items: Record<string, unknown>[] };
  @ApiProperty({
    type: Object,
    example: {
      requestId: 'request-id',
      nextCursor: null,
      limit: 50,
      projectionLedgerVersion: 42,
      dataCutoffAt: '2026-07-16T18:00:00.000Z',
    },
  })
  meta!: Record<string, unknown>;
}
