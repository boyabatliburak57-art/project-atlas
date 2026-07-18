import { ApiPropertyOptional } from '@nestjs/swagger';

export class FundamentalsQueryDto {
  @ApiPropertyOptional({
    enum: ['annual', 'quarterly', 'ttm'],
    default: 'annual',
  })
  periodType?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 20, default: 20 })
  limit?: string;
  @ApiPropertyOptional({
    description: 'Allowlisted metric code for trend endpoint',
  })
  metric?: string;
}
