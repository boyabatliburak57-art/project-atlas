import { describe, expect, it } from 'vitest';

import type { Portfolio, PortfolioTransaction } from './contracts.js';
import {
  buildCsv,
  PORTFOLIO_CSV_HEADERS,
  PORTFOLIO_CSV_LIMITS,
  previewPortfolioCsv,
  safeCsvCell,
  type PortfolioCsvFile,
} from './csv-import.js';

const portfolioId = '00000000-0000-4000-8000-000000004801';
const userId = '00000000-0000-4000-8000-000000004802';
const instrumentId = '00000000-0000-4000-8000-000000004803';
const portfolio: Portfolio = {
  id: portfolioId,
  userId,
  name: 'Ana Portföy',
  description: null,
  reportingCurrency: 'TRY',
  defaultBenchmarkCode: null,
  status: 'active',
  ledgerVersion: 0,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
};
const symbols = {
  resolve(values: readonly string[]) {
    return Promise.resolve(
      new Map(
        values
          .filter((value) => value === 'THYAO')
          .map((value) => [value, instrumentId]),
      ),
    );
  },
};

describe('portfolio CSV preview and export security', () => {
  it('previews a valid UTF-8 CSV and normalizes decimals', async () => {
    const result = await preview(validCsv());
    expect(result).toMatchObject({
      delimiter: ',',
      encoding: 'utf-8',
      totalRowCount: 1,
      validRowCount: 1,
      invalidRowCount: 0,
    });
    expect(result.rows[0]?.normalizedData).toMatchObject({
      type: 'buy',
      symbol: 'THYAO',
      quantity: '2.5',
      unitPrice: '100.25',
    });
  });

  it('detects a semicolon delimiter and quoted UTF-8 note', async () => {
    const csv = `${PORTFOLIO_CSV_HEADERS.join(';')}\nAna Portföy;BUY;THYAO;2026-01-02;1;10;0;0;;ref-1;"Türkçe, not"`;
    const result = await preview(csv);
    expect(result.delimiter).toBe(';');
    expect(result.rows[0]?.rawData.note).toBe('Türkçe, not');
  });

  it.each([
    [
      'invalid date',
      mutateCell(validCsv(), 3, '2026-02-30'),
      'CSV_DATE_INVALID',
    ],
    [
      'invalid decimal',
      mutateCell(validCsv(), 4, '1,2x'),
      'CSV_DECIMAL_INVALID',
    ],
    [
      'unknown symbol',
      mutateCell(validCsv(), 2, 'UNKNOWN'),
      'CSV_SYMBOL_UNKNOWN',
    ],
    [
      'formula input',
      mutateCell(validCsv(), 10, '=HYPERLINK("x")'),
      'CSV_FORMULA_INJECTION',
    ],
  ])(
    'reports %s without throwing away the preview',
    async (_name, csv, code) => {
      const result = await preview(csv);
      expect(result.invalidRowCount).toBe(1);
      expect(result.errorSummary[code]).toBe(1);
    },
  );

  it('detects duplicate rows inside the same file', async () => {
    const lines = validCsv().split('\n');
    const result = await preview(`${validCsv()}\n${lines[1]}`);
    expect(result.validRowCount).toBe(1);
    expect(result.invalidRowCount).toBe(1);
    expect(result.errorSummary.CSV_ROW_DUPLICATE).toBe(1);
  });

  it('detects an existing external reference as a duplicate transaction', async () => {
    const first = await preview(validCsv());
    const normalized = first.rows[0]?.normalizedData;
    expect(normalized).toBeDefined();
    const result = await preview(validCsv(), [
      existingTransaction(
        normalized?.normalizedTransactionHash ?? '',
        normalized?.externalReference ?? null,
      ),
    ]);
    expect(result.duplicateRowCount).toBe(1);
    expect(result.rows[0]?.duplicateOfTransactionId).toBe(
      '00000000-0000-4000-8000-000000004899',
    );
  });

  it('rejects invalid UTF-8, oversized files and overlong notes or references', async () => {
    await expect(
      previewPortfolioCsv({
        userId,
        portfolio,
        file: {
          filename: 'bad.csv',
          contentType: 'text/csv',
          size: 1,
          bytes: Uint8Array.of(0xff),
        },
        symbols,
        existingTransactions: [],
      }),
    ).rejects.toMatchObject({
      code: 'PORTFOLIO_CSV_INVALID',
      details: { code: 'CSV_ENCODING_INVALID' },
    });
    const bytes = new Uint8Array(PORTFOLIO_CSV_LIMITS.maximumBytes + 1);
    await expect(
      previewPortfolioCsv({
        userId,
        portfolio,
        file: {
          filename: 'large.csv',
          contentType: 'text/csv',
          size: bytes.byteLength,
          bytes,
        },
        symbols,
        existingTransactions: [],
      }),
    ).rejects.toMatchObject({
      details: { code: 'CSV_FILE_SIZE_INVALID' },
    });
    const longReference = 'r'.repeat(
      PORTFOLIO_CSV_LIMITS.maximumExternalReferenceCharacters + 1,
    );
    const result = await preview(mutateCell(validCsv(), 9, longReference));
    expect(result.errorSummary.CSV_EXTERNAL_REFERENCE_TOO_LONG).toBe(1);
    const longNote = 'n'.repeat(PORTFOLIO_CSV_LIMITS.maximumNoteCharacters + 1);
    const noteResult = await preview(mutateCell(validCsv(), 10, longNote));
    expect(noteResult.errorSummary.CSV_NOTE_TOO_LONG).toBe(1);
  });

  it('escapes formula injection in every exported cell', () => {
    expect(safeCsvCell('=1+1')).toBe("'=1+1");
    expect(safeCsvCell('+cmd')).toBe("'+cmd");
    expect(safeCsvCell('-cmd')).toBe("'-cmd");
    expect(safeCsvCell('@cmd')).toBe("'@cmd");
    expect(buildCsv(['note'], [['=1+1']])).toBe("note\r\n'=1+1");
  });

  it('previews the 10,000 row maximum within bounded time and memory', async () => {
    const header = PORTFOLIO_CSV_HEADERS.join(',');
    const rows = Array.from(
      { length: PORTFOLIO_CSV_LIMITS.maximumRows },
      (_, index) =>
        `Ana Portföy,cashDeposit,,${index % 10 === 0 ? 'invalid-date' : '2026-01-02'},,,,,1,perf-${index},note`,
    );
    const csv = [header, ...rows].join('\n');
    const before = process.memoryUsage().heapUsed;
    const started = performance.now();
    const result = await preview(csv);
    const durationMs = performance.now() - started;
    const heapDeltaBytes = Math.max(0, process.memoryUsage().heapUsed - before);
    expect(result.validRowCount).toBe(9_000);
    expect(result.invalidRowCount).toBe(1_000);
    expect(result.errorSummary.CSV_DATE_INVALID).toBe(1_000);
    expect(durationMs).toBeLessThan(5_000);
    expect(heapDeltaBytes).toBeLessThan(256 * 1024 * 1024);
  });

  it('rejects a file above the 10,000 row limit', async () => {
    const row = 'Ana Portföy,cashDeposit,,2026-01-02,,,,,1,ref,note';
    const csv = [
      PORTFOLIO_CSV_HEADERS.join(','),
      ...Array.from(
        { length: PORTFOLIO_CSV_LIMITS.maximumRows + 1 },
        () => row,
      ),
    ].join('\n');
    await expect(preview(csv)).rejects.toMatchObject({
      details: { code: 'CSV_ROW_LIMIT_EXCEEDED' },
    });
  });
});

function validCsv() {
  return `${PORTFOLIO_CSV_HEADERS.join(',')}\nAna Portföy,buy,THYAO,2026-01-02,2.5000,100.2500,1.25,0,,ext-1,uzun vade`;
}

function mutateCell(csv: string, index: number, value: string) {
  const [header, data = ''] = csv.split('\n');
  const cells = data.split(',');
  cells[index] = value;
  return `${header}\n${cells.join(',')}`;
}

function preview(
  csv: string,
  existingTransactions: readonly PortfolioTransaction[] = [],
) {
  const bytes = Buffer.from(csv, 'utf8');
  const file: PortfolioCsvFile = {
    filename: 'transactions.csv',
    contentType: 'text/csv',
    size: bytes.byteLength,
    bytes,
  };
  return previewPortfolioCsv({
    userId,
    portfolio,
    file,
    symbols,
    existingTransactions,
  });
}

function existingTransaction(
  normalizedTransactionHash: string,
  externalReference: string | null,
): PortfolioTransaction {
  return {
    id: '00000000-0000-4000-8000-000000004899',
    portfolioId,
    instrumentId,
    reversalOfTransactionId: null,
    sequence: 1,
    type: 'buy',
    status: 'posted',
    tradeAt: new Date('2026-01-02T00:00:00.000Z'),
    settlementAt: null,
    quantity: '2.5',
    unitPrice: '100.25',
    fee: '1.25',
    tax: '0',
    cashAmount: null,
    source: 'csv_import',
    externalReference,
    idempotencyKeyHash: 'key',
    normalizedTransactionHash,
    corporateActionIdentityHash: null,
    adjustmentReason: null,
    note: 'uzun vade',
    createdBy: userId,
    postedAt: new Date('2026-01-02T00:00:00.000Z'),
    reversedAt: null,
    deletedAt: null,
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };
}
