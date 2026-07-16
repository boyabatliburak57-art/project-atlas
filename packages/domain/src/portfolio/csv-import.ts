import { createHash } from 'node:crypto';

import type { Portfolio, PortfolioTransaction } from './contracts.js';
import { PortfolioError } from './errors.js';
import { normalizeDraft } from './transaction-normalization.js';

export const PORTFOLIO_CSV_HEADERS = [
  'portfolio',
  'transactionType',
  'symbol',
  'tradeDate',
  'quantity',
  'unitPrice',
  'fee',
  'tax',
  'cashAmount',
  'externalReference',
  'note',
] as const;

export const PORTFOLIO_CSV_LIMITS = {
  maximumBytes: 5 * 1024 * 1024,
  maximumRows: 10_000,
  maximumCellCharacters: 4_000,
  maximumExternalReferenceCharacters: 255,
  maximumNoteCharacters: 4_000,
} as const;

export interface PortfolioCsvFile {
  readonly filename: string;
  readonly contentType: string;
  readonly size: number;
  readonly bytes: Uint8Array;
}

export interface PortfolioCsvValidationError {
  readonly code: string;
  readonly field: string | null;
  readonly message: string;
}

export interface NormalizedPortfolioCsvRow {
  readonly portfolioId: string;
  readonly type:
    | 'buy'
    | 'sell'
    | 'cashDeposit'
    | 'cashWithdrawal'
    | 'dividend'
    | 'fee'
    | 'tax'
    | 'adjustment';
  readonly instrumentId: string | null;
  readonly symbol: string | null;
  readonly tradeAt: string;
  readonly quantity: string | null;
  readonly unitPrice: string | null;
  readonly fee: string;
  readonly tax: string;
  readonly cashAmount: string | null;
  readonly externalReference: string | null;
  readonly adjustmentReason: string | null;
  readonly note: string | null;
  readonly idempotencyKey: string;
  readonly normalizedTransactionHash: string;
}

export interface PortfolioCsvPreviewRow {
  readonly rowNumber: number;
  readonly status: 'valid' | 'invalid' | 'duplicate';
  readonly duplicateOfTransactionId: string | null;
  readonly normalizedTransactionHash: string | null;
  readonly rawData: Readonly<Record<string, string>>;
  readonly normalizedData: NormalizedPortfolioCsvRow | null;
  readonly validationErrors: readonly PortfolioCsvValidationError[];
}

export interface PortfolioCsvPreview {
  readonly filename: string;
  readonly contentType: string;
  readonly fileSize: number;
  readonly fileHash: string;
  readonly encoding: 'utf-8';
  readonly delimiter: ',' | ';';
  readonly rows: readonly PortfolioCsvPreviewRow[];
  readonly totalRowCount: number;
  readonly validRowCount: number;
  readonly invalidRowCount: number;
  readonly duplicateRowCount: number;
  readonly previewHash: string;
  readonly errorSummary: Readonly<Record<string, number>>;
}

export interface CsvSymbolResolver {
  resolve(symbols: readonly string[]): Promise<ReadonlyMap<string, string>>;
}

export async function previewPortfolioCsv(input: {
  readonly userId: string;
  readonly portfolio: Portfolio;
  readonly file: PortfolioCsvFile;
  readonly symbols: CsvSymbolResolver;
  readonly existingTransactions: readonly PortfolioTransaction[];
}): Promise<PortfolioCsvPreview> {
  validateFile(input.file);
  const text = decodeUtf8(input.file.bytes);
  const delimiter = detectDelimiter(text);
  const records = parseCsv(text, delimiter);
  if (records.length === 0) throw csvError('CSV_HEADER_INVALID');
  validateHeader(records[0] ?? []);
  const dataRecords = records
    .slice(1)
    .filter((record) => record.some((cell) => cell.trim().length > 0));
  if (dataRecords.length > PORTFOLIO_CSV_LIMITS.maximumRows)
    throw csvError('CSV_ROW_LIMIT_EXCEEDED');
  const symbols = [
    ...new Set(
      dataRecords
        .map((record) => normalizeSymbol(record[2] ?? ''))
        .filter((symbol) => symbol.length > 0),
    ),
  ];
  const resolved = await input.symbols.resolve(symbols);
  const fileHash = sha256(input.file.bytes);
  const existingByReference = new Map(
    input.existingTransactions
      .filter((transaction) => transaction.externalReference !== null)
      .map((transaction) => [transaction.externalReference!, transaction]),
  );
  const existingByHash = new Map(
    input.existingTransactions.map((transaction) => [
      transaction.normalizedTransactionHash,
      transaction,
    ]),
  );
  const seen = new Set<string>();
  const rows = dataRecords.map((record, index) => {
    const rowNumber = index + 2;
    const rawData = Object.fromEntries(
      PORTFOLIO_CSV_HEADERS.map((header, cellIndex) => [
        header,
        record[cellIndex] ?? '',
      ]),
    );
    const errors = analyzeRowCells(rawData);
    const normalized = normalizeRow({
      userId: input.userId,
      portfolio: input.portfolio,
      rawData,
      resolved,
      fileHash,
      rowNumber,
      errors,
    });
    if (normalized === null) return invalidRow(rowNumber, rawData, errors);
    const existing =
      (normalized.externalReference === null
        ? undefined
        : existingByReference.get(normalized.externalReference)) ??
      existingByHash.get(normalized.normalizedTransactionHash);
    if (existing) {
      return {
        rowNumber,
        status: 'duplicate' as const,
        duplicateOfTransactionId: existing.id,
        normalizedTransactionHash: normalized.normalizedTransactionHash,
        rawData,
        normalizedData: normalized,
        validationErrors: [
          validationError(
            'CSV_TRANSACTION_DUPLICATE',
            normalized.externalReference === null ? null : 'externalReference',
          ),
        ],
      };
    }
    if (seen.has(normalized.normalizedTransactionHash)) {
      return invalidRow(rowNumber, rawData, [
        validationError('CSV_ROW_DUPLICATE', null),
      ]);
    }
    seen.add(normalized.normalizedTransactionHash);
    return {
      rowNumber,
      status: 'valid' as const,
      duplicateOfTransactionId: null,
      normalizedTransactionHash: normalized.normalizedTransactionHash,
      rawData,
      normalizedData: normalized,
      validationErrors: [],
    };
  });
  const errorSummary: Record<string, number> = {};
  for (const row of rows)
    for (const error of row.validationErrors)
      errorSummary[error.code] = (errorSummary[error.code] ?? 0) + 1;
  const previewHash = portfolioCsvPreviewHash(rows);
  return {
    filename: input.file.filename,
    contentType: input.file.contentType,
    fileSize: input.file.size,
    fileHash,
    encoding: 'utf-8',
    delimiter,
    rows,
    totalRowCount: rows.length,
    validRowCount: rows.filter((row) => row.status === 'valid').length,
    invalidRowCount: rows.filter((row) => row.status === 'invalid').length,
    duplicateRowCount: rows.filter((row) => row.status === 'duplicate').length,
    previewHash,
    errorSummary,
  };
}

export function portfolioCsvPreviewHash(
  rows: readonly PortfolioCsvPreviewRow[],
): string {
  return sha256(
    stableJson(
      rows.map((row) => ({
        rowNumber: row.rowNumber,
        status: row.status,
        duplicateOfTransactionId: row.duplicateOfTransactionId,
        normalizedTransactionHash: row.normalizedTransactionHash,
        normalizedData: row.normalizedData,
        validationErrors: row.validationErrors,
      })),
    ),
  );
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map((item) => stableJson(item)).join(',')}]`;
  const record = value as Readonly<Record<string, unknown>>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(',')}}`;
}

export function safeCsvCell(value: unknown): string {
  const raw = csvString(value);
  const protectedValue = /^[=+\-@]/u.test(raw) ? `'${raw}` : raw;
  return /[",\r\n;]/u.test(protectedValue)
    ? `"${protectedValue.replaceAll('"', '""')}"`
    : protectedValue;
}

function csvString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  )
    return `${value}`;
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value) ?? '';
}

export function buildCsv(
  headers: readonly string[],
  rows: readonly (readonly unknown[])[],
): string {
  return [
    headers.map(safeCsvCell).join(','),
    ...rows.map((row) => row.map(safeCsvCell).join(',')),
  ].join('\r\n');
}

function validateFile(file: PortfolioCsvFile): void {
  if (
    file.filename.length > 255 ||
    file.contentType.length > 128 ||
    !file.filename.toLowerCase().endsWith('.csv') ||
    !['text/csv', 'application/csv', 'text/plain'].includes(
      file.contentType.toLowerCase().split(';')[0] ?? '',
    )
  )
    throw csvError('CSV_FILE_TYPE_INVALID');
  if (
    file.size <= 0 ||
    file.size !== file.bytes.byteLength ||
    file.size > PORTFOLIO_CSV_LIMITS.maximumBytes
  )
    throw csvError('CSV_FILE_SIZE_INVALID');
}

function decodeUtf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true })
      .decode(bytes)
      .replace(/^\uFEFF/u, '');
  } catch {
    throw csvError('CSV_ENCODING_INVALID');
  }
}

function detectDelimiter(text: string): ',' | ';' {
  const firstLine = text.split(/\r?\n/u, 1)[0] ?? '';
  const commas = countDelimiter(firstLine, ',');
  const semicolons = countDelimiter(firstLine, ';');
  if (commas === PORTFOLIO_CSV_HEADERS.length - 1 && semicolons === 0)
    return ',';
  if (semicolons === PORTFOLIO_CSV_HEADERS.length - 1 && commas === 0)
    return ';';
  throw csvError('CSV_DELIMITER_INVALID');
}

function countDelimiter(line: string, delimiter: ',' | ';'): number {
  let quoted = false;
  let count = 0;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (!quoted && character === delimiter) count += 1;
  }
  return count;
}

function parseCsv(text: string, delimiter: ',' | ';'): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else quoted = false;
      } else cell += character;
      continue;
    }
    if (character === '"' && cell.length === 0) quoted = true;
    else if (character === delimiter) {
      record.push(cell);
      cell = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      record.push(cell);
      records.push(record);
      record = [];
      cell = '';
    } else cell += character;
  }
  if (quoted) throw csvError('CSV_QUOTE_INVALID');
  if (cell.length > 0 || record.length > 0) {
    record.push(cell);
    records.push(record);
  }
  return records;
}

function validateHeader(header: readonly string[]): void {
  if (
    header.length !== PORTFOLIO_CSV_HEADERS.length ||
    header.some((value, index) => value.trim() !== PORTFOLIO_CSV_HEADERS[index])
  )
    throw csvError('CSV_HEADER_INVALID');
}

function analyzeRowCells(
  rawData: Readonly<Record<string, string>>,
): PortfolioCsvValidationError[] {
  const errors: PortfolioCsvValidationError[] = [];
  for (const [field, value] of Object.entries(rawData)) {
    if (value.length > PORTFOLIO_CSV_LIMITS.maximumCellCharacters)
      errors.push(validationError('CSV_CELL_TOO_LONG', field));
    if (/^[=+\-@]/u.test(value.trimStart()))
      errors.push(validationError('CSV_FORMULA_INJECTION', field));
  }
  if (
    (rawData.externalReference?.length ?? 0) >
    PORTFOLIO_CSV_LIMITS.maximumExternalReferenceCharacters
  )
    errors.push(
      validationError('CSV_EXTERNAL_REFERENCE_TOO_LONG', 'externalReference'),
    );
  if ((rawData.note?.length ?? 0) > PORTFOLIO_CSV_LIMITS.maximumNoteCharacters)
    errors.push(validationError('CSV_NOTE_TOO_LONG', 'note'));
  return errors;
}

function normalizeRow(input: {
  readonly userId: string;
  readonly portfolio: Portfolio;
  readonly rawData: Readonly<Record<string, string>>;
  readonly resolved: ReadonlyMap<string, string>;
  readonly fileHash: string;
  readonly rowNumber: number;
  readonly errors: PortfolioCsvValidationError[];
}): NormalizedPortfolioCsvRow | null {
  const raw = input.rawData;
  if (
    raw.portfolio?.trim() !== input.portfolio.id &&
    raw.portfolio?.trim() !== input.portfolio.name
  )
    input.errors.push(validationError('CSV_PORTFOLIO_MISMATCH', 'portfolio'));
  const type = transactionType(raw.transactionType ?? '');
  if (type === null)
    input.errors.push(
      validationError('CSV_TRANSACTION_TYPE_INVALID', 'transactionType'),
    );
  const tradeDate = raw.tradeDate?.trim() ?? '';
  if (!validDate(tradeDate))
    input.errors.push(validationError('CSV_DATE_INVALID', 'tradeDate'));
  const symbol = normalizeSymbol(raw.symbol ?? '');
  const instrumentId =
    symbol.length === 0 ? null : (input.resolved.get(symbol) ?? null);
  if (symbol.length > 0 && instrumentId === null)
    input.errors.push(validationError('CSV_SYMBOL_UNKNOWN', 'symbol'));
  if (input.errors.length > 0 || type === null) return null;
  try {
    const normalized = normalizeDraft(
      {
        userId: input.userId,
        portfolioId: input.portfolio.id,
        idempotencyKey: `csv:${input.fileHash}:${input.rowNumber}`,
        source: 'csv_import',
        type,
        instrumentId,
        tradeAt: new Date(`${tradeDate}T00:00:00.000Z`),
        quantity: emptyToNull(raw.quantity),
        unitPrice: emptyToNull(raw.unitPrice),
        fee: emptyToNull(raw.fee) ?? '0',
        tax: emptyToNull(raw.tax) ?? '0',
        cashAmount: emptyToNull(raw.cashAmount),
        externalReference: emptyToNull(raw.externalReference),
        adjustmentReason: type === 'adjustment' ? emptyToNull(raw.note) : null,
        note: emptyToNull(raw.note),
      },
      new Date(0),
    );
    return {
      portfolioId: input.portfolio.id,
      type,
      instrumentId,
      symbol: symbol || null,
      tradeAt: normalized.tradeAt.toISOString(),
      quantity: normalized.quantity,
      unitPrice: normalized.unitPrice,
      fee: normalized.fee,
      tax: normalized.tax,
      cashAmount: normalized.cashAmount,
      externalReference: normalized.externalReference,
      adjustmentReason: normalized.adjustmentReason,
      note: normalized.note,
      idempotencyKey: `csv:${input.fileHash}:${input.rowNumber}`,
      normalizedTransactionHash: normalized.normalizedTransactionHash,
    };
  } catch (error) {
    const details = error instanceof PortfolioError ? error.details : undefined;
    input.errors.push({
      code:
        error instanceof PortfolioError &&
        ['PORTFOLIO_DECIMAL_INVALID', 'PORTFOLIO_DECIMAL_OVERFLOW'].includes(
          error.code,
        )
          ? 'CSV_DECIMAL_INVALID'
          : 'CSV_TRANSACTION_INVALID',
      field: detailField(details),
      message: 'CSV transaction is invalid',
    });
    return null;
  }
}

function transactionType(
  value: string,
): NormalizedPortfolioCsvRow['type'] | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replaceAll(/[_\s-]/gu, '');
  return IMPORT_TYPES[normalized as keyof typeof IMPORT_TYPES] ?? null;
}

const IMPORT_TYPES = {
  buy: 'buy',
  sell: 'sell',
  cashdeposit: 'cashDeposit',
  cashwithdrawal: 'cashWithdrawal',
  dividend: 'dividend',
  fee: 'fee',
  tax: 'tax',
  adjustment: 'adjustment',
} as const;

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function normalizeSymbol(value: string): string {
  return value.trim().toUpperCase();
}

function emptyToNull(value: string | undefined): string | null {
  const normalized = value?.trim() ?? '';
  return normalized.length === 0 ? null : normalized;
}

function invalidRow(
  rowNumber: number,
  rawData: Readonly<Record<string, string>>,
  errors: readonly PortfolioCsvValidationError[],
): PortfolioCsvPreviewRow {
  return {
    rowNumber,
    status: 'invalid',
    duplicateOfTransactionId: null,
    normalizedTransactionHash: null,
    rawData,
    normalizedData: null,
    validationErrors: errors,
  };
}

function validationError(
  code: string,
  field: string | null,
): PortfolioCsvValidationError {
  return { code, field, message: code.replaceAll('_', ' ').toLowerCase() };
}

function detailField(details: unknown): string | null {
  if (
    typeof details === 'object' &&
    details !== null &&
    'field' in details &&
    typeof details.field === 'string'
  )
    return details.field;
  return null;
}

function csvError(code: string): PortfolioError {
  return new PortfolioError('PORTFOLIO_CSV_INVALID', { code });
}

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}
