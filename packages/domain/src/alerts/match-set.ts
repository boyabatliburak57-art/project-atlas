import type { MatchSetComparison } from './contracts.js';
import { AlertDomainError } from './errors.js';

export function compareMatchSets(
  previousMatches: readonly string[],
  currentMatches: readonly string[],
): MatchSetComparison {
  const previous = normalizedSet(previousMatches);
  const current = normalizedSet(currentMatches);
  return Object.freeze({
    entered: Object.freeze(
      current.filter((value) => !previous.includes(value)),
    ),
    exited: Object.freeze(previous.filter((value) => !current.includes(value))),
    unchanged: Object.freeze(
      current.filter((value) => previous.includes(value)),
    ),
  });
}

function normalizedSet(values: readonly string[]): string[] {
  if (values.some((value) => value.trim().length === 0)) {
    throw new AlertDomainError('ALERT_INVALID', {
      field: 'matchedInstrumentIds',
    });
  }
  return [...new Set(values)].sort();
}
