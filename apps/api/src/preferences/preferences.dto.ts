import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePreferencesDto {
  @ApiProperty({ minimum: 1 }) expectedVersion!: number;
  @ApiPropertyOptional({ enum: ['tr-TR', 'en-US'] }) locale?: string;
  @ApiPropertyOptional({ example: 'Europe/Istanbul' }) timezone?: string;
  @ApiPropertyOptional({ example: 'dd.MM.yyyy' }) dateFormat?: string;
  @ApiPropertyOptional({ enum: ['tr-TR', 'en-US'] }) numberFormat?: string;
  @ApiPropertyOptional({ example: 'TRY' }) currency?: string;
  @ApiPropertyOptional({ example: 'BIST' }) defaultMarket?: string;
  @ApiPropertyOptional({ example: 'XU100' }) defaultBenchmark?: string;
  @ApiPropertyOptional({ enum: ['adjusted', 'unadjusted'] })
  defaultChartAdjustment?: string;
  @ApiPropertyOptional({ enum: ['1d', '1w', '1mo'] })
  defaultTimeframe?: string;
  @ApiPropertyOptional({ type: [String] }) notificationChannels?: string[];
  @ApiPropertyOptional({ type: 'object', additionalProperties: false })
  quietHours?: object;
  @ApiPropertyOptional({ type: 'object', additionalProperties: false })
  accessibility?: object;
  @ApiPropertyOptional({ type: 'object', additionalProperties: false })
  display?: object;
  @ApiPropertyOptional({ type: 'object', additionalProperties: false })
  onboarding?: object;
}

export class OnboardingCommandDto {
  @ApiProperty({ minimum: 1 }) expectedVersion!: number;
  @ApiPropertyOptional() demoDataRequested?: boolean;
}

export class PreferencesResponseDto {
  @ApiProperty({ type: 'object', additionalProperties: true }) data!: object;
  @ApiProperty({ type: 'object', additionalProperties: true }) meta!: object;
}
