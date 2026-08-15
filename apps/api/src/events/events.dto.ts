import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EventFeedQueryDto {
  @ApiPropertyOptional() category?: string;
  @ApiPropertyOptional() state?: string;
  @ApiPropertyOptional({ format: 'uuid' }) companyId?: string;
  @ApiPropertyOptional() symbol?: string;
  @ApiPropertyOptional({ enum: ['WATCHLIST', 'PORTFOLIO', 'ANY'] })
  relevance?: string;
  @ApiPropertyOptional({ minLength: 2, maxLength: 80 }) q?: string;
  @ApiPropertyOptional({ format: 'date-time' }) from?: string;
  @ApiPropertyOptional({ format: 'date-time' }) to?: string;
  @ApiPropertyOptional() cursor?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 }) limit?: string;
}
export class EventResponseDto {
  @ApiProperty({ type: Object }) data!: Record<string, unknown>;
  @ApiProperty({ type: Object }) meta!: Record<string, unknown>;
}
