import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CommitPortfolioImportDto {
  @ApiPropertyOptional({ enum: ['atomic', 'partial'], default: 'atomic' })
  mode?: 'atomic' | 'partial';
}

export class PortfolioImportRowsQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 500, default: 100 })
  limit?: string;
  @ApiPropertyOptional({ description: 'Opaque row cursor' })
  cursor?: string;
}

export class PortfolioImportJobDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) portfolioId!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ enum: ['atomic', 'partial'] }) commitMode!: string;
  @ApiProperty() sourceFilename!: string;
  @ApiProperty() contentType!: string;
  @ApiProperty() fileSize!: number;
  @ApiProperty({ enum: ['utf-8'] }) encoding!: string;
  @ApiProperty({ enum: [',', ';'] }) delimiter!: string;
  @ApiProperty() totalRowCount!: number;
  @ApiProperty() validRowCount!: number;
  @ApiProperty() invalidRowCount!: number;
  @ApiProperty() duplicateRowCount!: number;
  @ApiProperty() committedRowCount!: number;
  @ApiProperty({ type: Object }) errorSummary!: Record<string, number>;
  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  previewExpiresAt!: string | null;
  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  committedAt!: string | null;
  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  cancelledAt!: string | null;
  @ApiPropertyOptional({ nullable: true }) errorCode!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class PortfolioImportResponseDto {
  @ApiProperty({ type: PortfolioImportJobDto }) data!: PortfolioImportJobDto;
  @ApiProperty({ type: Object }) meta!: Record<string, unknown>;
}

export class PortfolioImportRowsResponseDto {
  @ApiProperty({ type: Object }) data!: { items: unknown[] };
  @ApiProperty({ type: Object }) meta!: Record<string, unknown>;
}
