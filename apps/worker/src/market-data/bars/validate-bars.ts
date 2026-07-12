import type { ProviderBarDto } from '../providers';
import { compareDecimalStrings } from '../providers/decimal';
import type {
  BarPersistenceContext,
  BarValidationIssueCode,
  RejectedBar,
} from './contracts';

const DECIMAL_PATTERN = /^[+-]?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const NON_NEGATIVE_DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export interface BarValidationResult {
  readonly accepted: readonly ProviderBarDto[];
  readonly rejected: readonly RejectedBar[];
}

function barKey(bar: ProviderBarDto): string {
  return `${bar.providerSymbol}|${bar.timeframe}|${bar.openTime.toISOString()}`;
}

function validateBar(
  bar: ProviderBarDto,
  context: BarPersistenceContext,
  now: Date,
): BarValidationIssueCode[] {
  const codes: BarValidationIssueCode[] = [];
  const prices = [bar.open, bar.high, bar.low, bar.close];

  if (context.instrumentId === null) {
    codes.push('MAPPING_NOT_FOUND');
  }
  if (bar.providerSymbol !== context.command.providerSymbol) {
    codes.push('PROVIDER_SYMBOL_MISMATCH');
  }
  if (bar.timeframe !== context.command.timeframe) {
    codes.push('TIMEFRAME_MISMATCH');
  }
  if (
    bar.openTime < context.command.from ||
    bar.openTime >= context.command.to
  ) {
    codes.push('BAR_OUTSIDE_REQUEST_RANGE');
  }
  if (bar.closeTime <= bar.openTime) {
    codes.push('CLOSE_TIME_NOT_AFTER_OPEN_TIME');
  }
  if (
    bar.openTime.getTime() > now.getTime() + FUTURE_TOLERANCE_MS ||
    (bar.isClosed &&
      bar.closeTime.getTime() > now.getTime() + FUTURE_TOLERANCE_MS)
  ) {
    codes.push('FUTURE_TIMESTAMP');
  }
  if (prices.some((price) => !DECIMAL_PATTERN.test(price))) {
    codes.push('NUMBER_FORMAT_INVALID');
  } else {
    if (
      [bar.open, bar.close, bar.low].some(
        (price) => compareDecimalStrings(bar.high, price) < 0,
      )
    ) {
      codes.push('HIGH_PRICE_INVALID');
    }
    if (
      [bar.open, bar.close, bar.high].some(
        (price) => compareDecimalStrings(bar.low, price) > 0,
      )
    ) {
      codes.push('LOW_PRICE_INVALID');
    }
  }
  if (!NON_NEGATIVE_DECIMAL_PATTERN.test(bar.volume)) {
    codes.push('VOLUME_NEGATIVE');
  }

  return codes;
}

export function validateBars(
  bars: readonly ProviderBarDto[],
  context: BarPersistenceContext,
  now: Date,
): BarValidationResult {
  const seen = new Set<string>();
  const accepted: ProviderBarDto[] = [];
  const rejected: RejectedBar[] = [];

  for (const bar of bars) {
    const key = barKey(bar);
    const codes = validateBar(bar, context, now);
    if (seen.has(key)) {
      codes.push('DUPLICATE_BAR_IN_BATCH');
    }
    seen.add(key);

    if (codes.length === 0) {
      accepted.push(bar);
    } else {
      rejected.push({
        providerSymbol: bar.providerSymbol,
        timeframe: bar.timeframe,
        openTime: bar.openTime,
        codes,
      });
    }
  }

  return { accepted, rejected };
}
