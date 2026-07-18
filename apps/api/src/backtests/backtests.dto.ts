import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StrategyCreateDto {
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) description?: string | null;
  @ApiProperty({ type: Object }) definition!: Record<string, unknown>;
  @ApiPropertyOptional({ enum: ['draft', 'validated'] }) status?: string;
}

export class StrategyUpdateDto {
  @ApiProperty() expectedRevision!: number;
  @ApiPropertyOptional() name?: string;
  @ApiPropertyOptional({ nullable: true }) description?: string | null;
  @ApiPropertyOptional({ type: Object }) definition?: Record<string, unknown>;
  @ApiPropertyOptional({ enum: ['draft', 'validated'] }) status?: string;
}

export class StrategyValidateDto {
  @ApiProperty({ type: Object }) definition!: Record<string, unknown>;
}

export class ListQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100 }) limit?: number;
  @ApiPropertyOptional({ description: 'Opaque versioned cursor' })
  cursor?: string;
  @ApiPropertyOptional() status?: string;
}

export class StrategyListQueryDto {
  @ApiPropertyOptional({ enum: ['true', 'false'] }) includeDeleted?: string;
}

export class BacktestCreateDto {
  @ApiProperty() strategyId!: string;
  @ApiProperty() strategyRevision!: number;
  @ApiProperty({ type: Object }) executionPlan!: Record<string, unknown>;
  @ApiProperty() dataSnapshotHash!: string;
  @ApiProperty() rangeFrom!: string;
  @ApiProperty() rangeTo!: string;
  @ApiProperty() complexityScore!: number;
}

export class SeriesQueryDto {
  @ApiProperty({
    enum: ['equity', 'drawdown', 'cash', 'exposure', 'benchmark'],
  })
  type!: string;
  @ApiPropertyOptional() from?: string;
  @ApiPropertyOptional() to?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 5000 }) limit?: number;
  @ApiPropertyOptional({ enum: ['raw', 'daily', 'weekly'] })
  resolution?: string;
}

export class TradesQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) instrumentId?: string;
  @ApiPropertyOptional({ enum: ['closedAt:desc'] }) sort?: string;
}

export class ExperimentCreateDto {
  @ApiProperty() name!: string;
  @ApiProperty() strategyId!: string;
  @ApiProperty() strategyRevision!: number;
  @ApiProperty() dataSnapshotId!: string;
  @ApiProperty() dataSnapshotHash!: string;
  @ApiProperty({ type: Object }) definition!: Record<string, unknown>;
}

export class ApiDataResponseDto {
  @ApiProperty({ type: Object }) data!: unknown;
  @ApiProperty({ type: Object }) meta!: Record<string, unknown>;
}
