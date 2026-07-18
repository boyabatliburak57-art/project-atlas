import { createStableParameterHash } from '../indicators/parameter-hash.js';
import type { BacktestTimelineEvent } from './contracts.js';
import { BacktestDomainError } from './contracts.js';

const EVENT_PRIORITY: Readonly<Record<BacktestTimelineEvent['type'], number>> =
  {
    corporateAction: 1,
    forcedExit: 2,
    bar: 6,
  };

export interface OrderedBacktestTimeline {
  readonly events: readonly BacktestTimelineEvent[];
  readonly hash: string;
  readonly duplicateEventIds: readonly string[];
}

export function createOrderedBacktestTimeline(
  input: readonly BacktestTimelineEvent[],
): OrderedBacktestTimeline {
  const byId = new Map<string, BacktestTimelineEvent>();
  const duplicateEventIds: string[] = [];
  for (const event of input) {
    validateEvent(event);
    const existing = byId.get(event.eventId);
    if (existing === undefined) {
      byId.set(event.eventId, event);
      continue;
    }
    if (
      createStableParameterHash(existing) !== createStableParameterHash(event)
    ) {
      throw new BacktestDomainError('BACKTEST_EVENT_INVALID', {
        eventId: event.eventId,
        reason: 'duplicate_event_id_payload_mismatch',
      });
    }
    duplicateEventIds.push(event.eventId);
  }
  const events = [...byId.values()].sort(compareBacktestEvents);
  return {
    events,
    hash: createStableParameterHash(events),
    duplicateEventIds: [...new Set(duplicateEventIds)].sort(),
  };
}

export function createBacktestEventOrderKey(
  event: BacktestTimelineEvent,
): string {
  return [
    event.timestamp,
    String(EVENT_PRIORITY[event.type]).padStart(2, '0'),
    event.instrumentId,
    event.symbol,
    event.eventId,
  ].join('|');
}

function compareBacktestEvents(
  left: BacktestTimelineEvent,
  right: BacktestTimelineEvent,
): number {
  return createBacktestEventOrderKey(left).localeCompare(
    createBacktestEventOrderKey(right),
  );
}

function validateEvent(event: BacktestTimelineEvent): void {
  if (
    event.eventId.length === 0 ||
    event.instrumentId.length === 0 ||
    event.symbol.length === 0 ||
    !isIsoTimestamp(event.timestamp)
  ) {
    throw new BacktestDomainError('BACKTEST_EVENT_INVALID', {
      eventId: event.eventId,
    });
  }
}

function isIsoTimestamp(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}
