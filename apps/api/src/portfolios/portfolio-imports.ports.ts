import type {
  CsvSymbolResolver,
  PortfolioCsvPreview,
  PortfolioCsvPreviewRow,
} from '@atlas/domain';

export const PORTFOLIO_IMPORT_STORE = Symbol('PORTFOLIO_IMPORT_STORE');
export const PORTFOLIO_IMPORT_COMMITTER = Symbol('PORTFOLIO_IMPORT_COMMITTER');

export type PortfolioImportStatus =
  | 'uploaded'
  | 'validating'
  | 'preview_ready'
  | 'committing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface PortfolioImportJob {
  readonly id: string;
  readonly portfolioId: string;
  readonly userId: string;
  readonly status: PortfolioImportStatus;
  readonly commitMode: 'atomic' | 'partial';
  readonly sourceFilename: string;
  readonly contentType: string;
  readonly fileSize: number;
  readonly encoding: 'utf-8';
  readonly delimiter: ',' | ';';
  readonly fileHash: string;
  readonly previewHash: string;
  readonly idempotencyKeyHash: string;
  readonly previewRequestHash: string;
  readonly commitIdempotencyKeyHash: string | null;
  readonly commitRequestHash: string | null;
  readonly totalRowCount: number;
  readonly validRowCount: number;
  readonly invalidRowCount: number;
  readonly duplicateRowCount: number;
  readonly committedRowCount: number;
  readonly previewExpiresAt: Date | null;
  readonly committedAt: Date | null;
  readonly cancelledAt: Date | null;
  readonly errorCode: string | null;
  readonly errorSummary: Readonly<Record<string, number>>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface PortfolioImportStore extends CsvSymbolResolver {
  symbolsForInstrumentIds(
    instrumentIds: readonly string[],
  ): Promise<ReadonlyMap<string, string>>;
  findJob(jobId: string): Promise<PortfolioImportJob | null>;
  findByPreviewIdempotency(input: {
    readonly portfolioId: string;
    readonly userId: string;
    readonly idempotencyKeyHash: string;
  }): Promise<PortfolioImportJob | null>;
  findByFileHash(input: {
    readonly portfolioId: string;
    readonly userId: string;
    readonly fileHash: string;
  }): Promise<PortfolioImportJob | null>;
  savePreview(input: {
    readonly portfolioId: string;
    readonly userId: string;
    readonly preview: PortfolioCsvPreview;
    readonly idempotencyKeyHash: string;
    readonly previewRequestHash: string;
    readonly previewExpiresAt: Date;
    readonly now: Date;
  }): Promise<PortfolioImportJob>;
  rows(input: {
    readonly jobId: string;
    readonly limit: number;
    readonly afterRowNumber: number | null;
  }): Promise<{
    readonly items: readonly PortfolioCsvPreviewRow[];
    readonly nextRowNumber: number | null;
  }>;
  allRows(jobId: string): Promise<readonly PortfolioCsvPreviewRow[]>;
  cancel(input: {
    readonly jobId: string;
    readonly portfolioId: string;
    readonly userId: string;
    readonly now: Date;
  }): Promise<PortfolioImportJob | null>;
}

export interface PortfolioImportCommitter {
  commit(input: {
    readonly job: PortfolioImportJob;
    readonly rows: readonly PortfolioCsvPreviewRow[];
    readonly mode: 'atomic' | 'partial';
    readonly commitIdempotencyKeyHash: string;
    readonly commitRequestHash: string;
    readonly now: Date;
  }): Promise<{
    readonly job: PortfolioImportJob;
    readonly replayed: boolean;
  }>;
}
