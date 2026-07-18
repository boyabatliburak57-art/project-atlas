import { ApiPropertyOptional } from '@nestjs/swagger';
export class PatternQueryDto {
  @ApiPropertyOptional({
    enum: ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'],
    default: '1d',
  })
  timeframe?: string;
  @ApiPropertyOptional({
    enum: ['raw', 'split-adjusted', 'total-return'],
    default: 'raw',
  })
  adjustmentMode?: string;
  @ApiPropertyOptional({ enum: ['candidate', 'confirmed', 'invalidated'] })
  state?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  limit?: string;
}
