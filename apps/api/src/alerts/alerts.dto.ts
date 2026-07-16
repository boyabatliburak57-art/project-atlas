import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AlertSourceDto {
  @ApiProperty({
    enum: [
      'saved_scan',
      'preset_scan',
      'instrument_price',
      'instrument_percent_change',
      'instrument_indicator',
      'watchlist_saved_scan',
    ],
  })
  type!: string;

  @ApiPropertyOptional({ format: 'uuid' }) savedScanId?: string;
  @ApiPropertyOptional({ minimum: 1 }) savedScanRevision?: number;
  @ApiPropertyOptional({ format: 'uuid' }) presetScanId?: string;
  @ApiPropertyOptional({ minimum: 1 }) presetScanRevision?: number;
  @ApiPropertyOptional({ format: 'uuid' }) instrumentId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) watchlistId?: string;
}

export class AlertRevisionInputDto {
  @ApiProperty({ type: AlertSourceDto }) source!: AlertSourceDto;
  @ApiProperty({
    enum: [
      'anyMatch',
      'newMatch',
      'symbolEntered',
      'symbolExited',
      'thresholdCrossed',
    ],
  })
  triggerPolicy!: string;
  @ApiProperty({
    enum: [
      'once',
      'oncePerClosedBar',
      'oncePerDay',
      'afterReset',
      'everyNewMatch',
    ],
  })
  repeatPolicy!: string;
  @ApiPropertyOptional({ nullable: true, maxLength: 16 }) timeframe?:
    | string
    | null;
  @ApiProperty({ enum: ['closed_bar', 'intrabar'] }) evaluationMode!: string;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  sourceConfiguration?: Readonly<Record<string, unknown>>;
  @ApiProperty({ type: [String], enum: ['in_app', 'email'] })
  channels!: string[];
}

export class CreateAlertDto extends AlertRevisionInputDto {
  @ApiProperty({ maxLength: 160 }) name!: string;
}

export class UpdateAlertDto {
  @ApiProperty({ minimum: 1 }) expectedRevision!: number;
  @ApiPropertyOptional({ maxLength: 160 }) name?: string;
  @ApiPropertyOptional({ type: AlertSourceDto }) source?: AlertSourceDto;
  @ApiPropertyOptional() triggerPolicy?: string;
  @ApiPropertyOptional() repeatPolicy?: string;
  @ApiPropertyOptional({ nullable: true, maxLength: 16 }) timeframe?:
    | string
    | null;
  @ApiPropertyOptional({ enum: ['closed_bar', 'intrabar'] })
  evaluationMode?: string;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  sourceConfiguration?: Readonly<Record<string, unknown>>;
  @ApiPropertyOptional({ type: [String], enum: ['in_app', 'email'] })
  channels?: string[];
}

export class AlertListQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  limit?: number;
  @ApiPropertyOptional() cursor?: string;
  @ApiPropertyOptional({ enum: ['active', 'paused', 'invalid', 'deleted'] })
  status?: string;
}

export class HistoryQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  limit?: number;
  @ApiPropertyOptional() cursor?: string;
}

export class AlertRevisionDto extends AlertRevisionInputDto {
  @ApiProperty({ format: 'uuid' }) alertId!: string;
  @ApiProperty({ minimum: 1 }) revision!: number;
  @ApiProperty({ format: 'uuid' }) createdBy!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class AlertDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) ownerUserId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ['active', 'paused', 'invalid', 'deleted'] })
  status!: string;
  @ApiProperty() currentRevision!: number;
  @ApiProperty({ type: AlertRevisionDto }) revision!: AlertRevisionDto;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  deletedAt!: string | null;
}

export class AlertResponseDto {
  @ApiProperty({ type: AlertDto }) data!: AlertDto;
  @ApiProperty({ type: 'object', additionalProperties: true }) meta!: object;
}

export class AlertListResponseDto {
  @ApiProperty({ type: [AlertDto] }) data!: AlertDto[];
  @ApiProperty({ type: 'object', additionalProperties: true }) meta!: object;
}

export class AlertHistoryResponseDto {
  @ApiProperty({ type: [Object] }) data!: object[];
  @ApiProperty({ type: 'object', additionalProperties: true }) meta!: object;
}

export class AlertDryRunResponseDto {
  @ApiProperty({
    enum: ['matched', 'not_matched', 'not_evaluable', 'failed'],
  })
  status!: string;
  @ApiPropertyOptional({ nullable: true }) reasonCode!: string | null;
  @ApiProperty({ type: [String] }) matchedInstrumentIds!: string[];
  @ApiProperty({ format: 'date-time' }) dataCutoffAt!: string;
  @ApiProperty({ enum: [true] }) dryRun!: true;
}
