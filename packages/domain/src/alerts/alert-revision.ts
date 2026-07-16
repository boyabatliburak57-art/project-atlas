import type {
  AlertRevision,
  AlertSource,
  NewAlertRevision,
  ReviseAlertInput,
} from './contracts.js';
import { AlertDomainError } from './errors.js';

export function createAlertRevision(input: NewAlertRevision): AlertRevision {
  const revision = input.revision ?? 1;
  assertPositiveInteger(revision, 'revision');
  assertIdentifier(input.alertId, 'alertId');
  assertIdentifier(input.createdBy, 'createdBy');
  assertSource(input.source);
  assertTimeframe(input.timeframe);
  assertDate(input.createdAt, 'createdAt');

  return Object.freeze({
    alertId: input.alertId,
    revision,
    source: freezeSource(input.source),
    triggerPolicy: input.triggerPolicy,
    repeatPolicy: input.repeatPolicy,
    timeframe: input.timeframe,
    evaluationMode: input.evaluationMode,
    sourceConfiguration: freezeRecord(input.sourceConfiguration),
    channels: Object.freeze([...new Set(input.channels)].sort()),
    createdBy: input.createdBy,
    createdAt: new Date(input.createdAt),
  });
}

export function createNextAlertRevision(
  current: AlertRevision,
  input: ReviseAlertInput,
): AlertRevision {
  return createAlertRevision({
    alertId: current.alertId,
    revision: current.revision + 1,
    source: input.source ?? current.source,
    triggerPolicy: input.triggerPolicy ?? current.triggerPolicy,
    repeatPolicy: input.repeatPolicy ?? current.repeatPolicy,
    timeframe:
      input.timeframe === undefined ? current.timeframe : input.timeframe,
    evaluationMode: input.evaluationMode ?? current.evaluationMode,
    sourceConfiguration:
      input.sourceConfiguration ?? current.sourceConfiguration,
    channels: input.channels ?? current.channels,
    createdBy: input.createdBy,
    createdAt: input.createdAt,
  });
}

export function assertExpectedAlertRevision(
  currentRevision: number,
  expectedRevision: number,
): void {
  if (currentRevision !== expectedRevision) {
    throw new AlertDomainError('ALERT_REVISION_CONFLICT', {
      expectedRevision,
      currentRevision,
    });
  }
}

function assertSource(source: AlertSource): void {
  if (source.type === 'saved_scan') {
    assertIdentifier(source.savedScanId, 'savedScanId');
    assertPositiveInteger(source.savedScanRevision, 'savedScanRevision');
    return;
  }
  if (source.type === 'preset_scan') {
    assertIdentifier(source.presetScanId, 'presetScanId');
    assertPositiveInteger(source.presetScanRevision, 'presetScanRevision');
    return;
  }
  if (source.type === 'watchlist_saved_scan') {
    assertIdentifier(source.watchlistId, 'watchlistId');
    assertIdentifier(source.savedScanId, 'savedScanId');
    assertPositiveInteger(source.savedScanRevision, 'savedScanRevision');
    return;
  }
  assertIdentifier(source.instrumentId, 'instrumentId');
}

function freezeSource(source: AlertSource): AlertSource {
  return Object.freeze({ ...source });
}

function freezeRecord(
  value: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  return deepFreeze(cloneValue(value)) as Readonly<Record<string, unknown>>;
}

function cloneValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneValue(item)]),
    );
  }
  return value;
}

function deepFreeze(value: unknown): unknown {
  if (value !== null && typeof value === 'object') {
    for (const nested of Object.values(value)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

function assertIdentifier(value: string, field: string): void {
  if (value.trim().length === 0 || value.length > 160) invalid(field);
}

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 1) invalid(field);
}

function assertTimeframe(value: string | null): void {
  if (value !== null && (value.trim().length === 0 || value.length > 16)) {
    invalid('timeframe');
  }
}

function assertDate(value: Date, field: string): void {
  if (Number.isNaN(value.getTime())) invalid(field);
}

function invalid(field: string): never {
  throw new AlertDomainError('ALERT_INVALID', { field });
}
