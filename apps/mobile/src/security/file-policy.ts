export const MAX_SENSITIVE_REPORT_BYTES = 25 * 1024 * 1024;
export const TEMP_FILE_TTL_MS = 15 * 60_000;
export const ALLOWED_REPORT_TYPES = new Map([
  ['application/pdf', '.pdf'],
  ['text/csv', '.csv'],
]);

export interface ReportDownloadDescriptor {
  readonly ownerId: string;
  readonly url: string;
  readonly mimeType: 'application/pdf' | 'text/csv';
  readonly expectedChecksum?: string;
  readonly expiresAt: number;
}

export interface ValidatedReportFile {
  readonly ownerId: string;
  readonly uri: string;
  readonly mimeType: string;
  readonly size: number;
  readonly checksum: string;
  readonly expiresAt: number;
}

export function validateDownloadDescriptor(
  descriptor: ReportDownloadDescriptor,
  now: number,
): void {
  if (!/^[A-Za-z0-9._:-]{1,160}$/u.test(descriptor.ownerId))
    throw new Error('DOWNLOAD_VALIDATION_FAILED');
  const url = new URL(descriptor.url);
  if (url.protocol !== 'https:' || url.username || url.password)
    throw new Error('DOWNLOAD_VALIDATION_FAILED');
  if (
    !ALLOWED_REPORT_TYPES.has(descriptor.mimeType) ||
    descriptor.expiresAt <= now
  )
    throw new Error('DOWNLOAD_VALIDATION_FAILED');
}

export function validateDownloadedMetadata(input: {
  readonly expectedMime: string;
  readonly actualMime: string | null;
  readonly size: number;
  readonly extension: string;
}): void {
  const expectedExtension = ALLOWED_REPORT_TYPES.get(input.expectedMime);
  const actualMime = input.actualMime?.split(';', 1)[0]?.trim().toLowerCase();
  if (
    expectedExtension === undefined ||
    actualMime !== input.expectedMime ||
    input.extension.toLowerCase() !== expectedExtension ||
    input.size <= 0 ||
    input.size > MAX_SENSITIVE_REPORT_BYTES
  )
    throw new Error('DOWNLOAD_VALIDATION_FAILED');
}
