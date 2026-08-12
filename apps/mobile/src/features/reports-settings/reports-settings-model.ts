import { ATLAS_REPORT_TYPE_REGISTRY, type AtlasReportType } from '@atlas/types';

export const REPORT_TYPES: readonly AtlasReportType[] =
  ATLAS_REPORT_TYPE_REGISTRY.map(({ id }) => id);
export type ReportType = AtlasReportType;
export type ReportStatus =
  | 'queued'
  | 'validating'
  | 'generating'
  | 'ready'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'providerRequired';

export const REPORT_REGISTRY = Object.freeze(
  ATLAS_REPORT_TYPE_REGISTRY.map((entry) => ({
    ...entry,
    methodologyVersion: 'report-methodology-v1',
  })),
);

export function validateReportRequest(input: {
  type: string;
  sourceId?: string;
  format: string;
  offline?: boolean;
}): readonly string[] {
  const errors: string[] = [];
  if (input.offline) errors.push('NETWORK_UNAVAILABLE');
  if (!REPORT_TYPES.includes(input.type as ReportType))
    errors.push('REPORT_TYPE_UNSUPPORTED');
  if (!input.sourceId) errors.push('SOURCE_REQUIRED');
  if (!['pdf', 'csv'].includes(input.format)) errors.push('FORMAT_UNSUPPORTED');
  return errors;
}

export function csvCell(value: string): string {
  const neutralized = /^[=+\-@]/u.test(value) ? `'${value}` : value;
  return `"${neutralized.replaceAll('"', '""')}"`;
}

export function canUseDownload(input: {
  owner: boolean;
  status: ReportStatus;
  expiresAt: string;
  now: string;
}): boolean {
  return (
    input.owner &&
    input.status === 'ready' &&
    Date.parse(input.expiresAt) > Date.parse(input.now)
  );
}

export function normalizeHelpQuery(query: string): string {
  return query.normalize('NFKC').trim().replace(/\s+/gu, ' ').slice(0, 80);
}

export function sanitizeSupportText(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/giu, '')
    .replace(/<[^>]+>/gu, '')
    .trim()
    .slice(0, 8_000);
}

const diagnosticAllowlist = new Set([
  'appVersion',
  'buildNumber',
  'osVersion',
  'deviceClass',
  'route',
  'requestId',
  'reasonCode',
]);

export function redactDiagnostics(
  input: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(input).filter(([key]) => diagnosticAllowlist.has(key)),
  );
}

export function supportFormErrors(input: {
  subject: string;
  description: string;
  offline?: boolean;
}): readonly string[] {
  const errors: string[] = [];
  if (input.offline) errors.push('NETWORK_UNAVAILABLE');
  if (input.subject.trim().length < 4) errors.push('SUBJECT_TOO_SHORT');
  if (sanitizeSupportText(input.description).length < 8)
    errors.push('DESCRIPTION_TOO_SHORT');
  return errors;
}

export function preferenceMutation(input: {
  expectedVersion: number;
  serverVersion: number;
  offline?: boolean;
}): 'accepted' | 'conflict' | 'offline' {
  if (input.offline) return 'offline';
  return input.expectedVersion === input.serverVersion
    ? 'accepted'
    : 'conflict';
}

export function safeOperationsIntent(value: string): boolean {
  return /^(reports|help|support|settings|methodology|legal)(\/[a-z0-9-]+)?$/u.test(
    value,
  );
}

export function redactOperationsTelemetry(
  input: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  const forbidden = new Set([
    'reportContents',
    'portfolioValue',
    'strategyParameters',
    'supportDescription',
    'supportSubject',
    'email',
    'signedUrl',
    'token',
    'resourceId',
  ]);
  return Object.fromEntries(
    Object.entries(input).filter(([key]) => !forbidden.has(key)),
  );
}
