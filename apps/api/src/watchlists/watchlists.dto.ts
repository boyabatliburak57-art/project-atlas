import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWatchlistDto {
  @ApiProperty({ maxLength: 160 })
  name!: string;

  @ApiPropertyOptional({ maxLength: 4_000, nullable: true })
  description?: string | null;
}

export class UpdateWatchlistDto {
  @ApiPropertyOptional({ maxLength: 160 })
  name?: string;

  @ApiPropertyOptional({ maxLength: 4_000, nullable: true })
  description?: string | null;
}

export class AddWatchlistItemDto {
  @ApiProperty({ format: 'uuid' })
  instrumentId!: string;

  @ApiPropertyOptional({ maxLength: 2_000, nullable: true })
  note?: string | null;

  @ApiPropertyOptional({ type: [String], maxItems: 20 })
  tags?: string[];
}

export class UpdateWatchlistItemDto {
  @ApiPropertyOptional({ maxLength: 2_000, nullable: true })
  note?: string | null;

  @ApiPropertyOptional({ type: [String], maxItems: 20 })
  tags?: string[];
}

export class ReorderWatchlistItemsDto {
  @ApiProperty({ type: [String], maxItems: 500 })
  itemIds!: string[];
}

export class WatchlistsQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  limit?: string;

  @ApiPropertyOptional({ description: 'Opaque pagination cursor' })
  cursor?: string;

  @ApiPropertyOptional({ enum: ['true', 'false'], default: 'false' })
  includeDeleted?: string;
}

export class WatchlistMarketSummaryQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  limit?: string;

  @ApiPropertyOptional({ description: 'Opaque item-order cursor' })
  cursor?: string;
}

export class WatchlistItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  instrumentId!: string;

  @ApiPropertyOptional({ nullable: true })
  note!: string | null;

  @ApiProperty({ type: [String] })
  tags!: readonly string[];

  @ApiProperty({ minimum: 0 })
  sortOrder!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class WatchlistDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  ownerUserId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: ['private'] })
  visibility!: 'private';

  @ApiProperty({ enum: ['active', 'deleted'] })
  status!: string;

  @ApiProperty({ type: [WatchlistItemDto] })
  items!: WatchlistItemDto[];

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  deletedAt!: string | null;
}

export class WatchlistResponseMetaDto {
  @ApiProperty()
  requestId!: string;

  @ApiPropertyOptional({ nullable: true })
  nextCursor?: string | null;

  @ApiPropertyOptional({ format: 'date-time' })
  dataCutoffAt?: string;

  @ApiPropertyOptional({ minimum: 0 })
  staleAfterMs?: number;
}

export class WatchlistResponseDto {
  @ApiProperty({ type: WatchlistDto })
  data!: WatchlistDto;

  @ApiProperty({ type: WatchlistResponseMetaDto })
  meta!: WatchlistResponseMetaDto;
}

export class WatchlistListDataDto {
  @ApiProperty({ type: [WatchlistDto] })
  items!: WatchlistDto[];
}

export class WatchlistListResponseDto {
  @ApiProperty({ type: WatchlistListDataDto })
  data!: WatchlistListDataDto;

  @ApiProperty({ type: WatchlistResponseMetaDto })
  meta!: WatchlistResponseMetaDto;
}

export class WatchlistMarketSummaryItemDto {
  @ApiProperty({ format: 'uuid' })
  instrumentId!: string;

  @ApiProperty()
  symbol!: string;

  @ApiProperty()
  company!: string;

  @ApiPropertyOptional({ nullable: true })
  lastPrice!: string | null;

  @ApiPropertyOptional({ nullable: true })
  dailyChangePercent!: string | null;

  @ApiPropertyOptional({ nullable: true })
  volume!: string | null;

  @ApiPropertyOptional({ nullable: true })
  relativeVolume!: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  dataTime!: string | null;

  @ApiProperty()
  stale!: boolean;

  @ApiProperty({ minimum: 0 })
  activeAlertCount!: number;
}

export class WatchlistMarketSummaryDataDto {
  @ApiProperty({ format: 'uuid' })
  watchlistId!: string;

  @ApiProperty({ type: [WatchlistMarketSummaryItemDto] })
  items!: WatchlistMarketSummaryItemDto[];
}

export class WatchlistMarketSummaryResponseDto {
  @ApiProperty({ type: WatchlistMarketSummaryDataDto })
  data!: WatchlistMarketSummaryDataDto;

  @ApiProperty({ type: WatchlistResponseMetaDto })
  meta!: WatchlistResponseMetaDto;
}
