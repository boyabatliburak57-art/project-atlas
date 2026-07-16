import { createHash } from 'node:crypto';

import type {
  AlertEvaluationIdentity,
  AlertTriggerIdentity,
} from './contracts.js';
import { AlertDomainError } from './errors.js';

export function createEvaluationIdentityKey(
  identity: AlertEvaluationIdentity,
): string {
  validateEvaluationIdentity(identity);
  return encode([
    'alert-evaluation',
    'v1',
    identity.alertId,
    String(identity.alertRevision),
    identity.sourceEventId,
    identity.dataCutoffAt.toISOString(),
  ]);
}

export function createTriggerDeduplicationKey(
  identity: AlertTriggerIdentity,
): string {
  validateEvaluationIdentity(identity);
  const canonical = encode([
    'alert-trigger',
    'v1',
    identity.alertId,
    String(identity.alertRevision),
    identity.triggerType,
    identity.instrumentId ?? '',
    identity.timeframe ?? '',
    identity.evaluationWindow ?? '',
    identity.sourceEventId,
    identity.dataCutoffAt.toISOString(),
  ]);
  return `alert-trigger:v1:${createHash('sha256').update(canonical).digest('hex')}`;
}

export function isSameEvaluation(
  left: AlertEvaluationIdentity,
  right: AlertEvaluationIdentity,
): boolean {
  return (
    createEvaluationIdentityKey(left) === createEvaluationIdentityKey(right)
  );
}

function validateEvaluationIdentity(identity: AlertEvaluationIdentity): void {
  if (
    identity.alertId.trim().length === 0 ||
    !Number.isInteger(identity.alertRevision) ||
    identity.alertRevision < 1 ||
    identity.sourceEventId.trim().length === 0 ||
    identity.sourceEventId.length > 160 ||
    Number.isNaN(identity.dataCutoffAt.getTime())
  ) {
    throw new AlertDomainError('ALERT_INVALID', {
      field: 'evaluationIdentity',
    });
  }
}

function encode(parts: readonly string[]): string {
  return parts.map((part) => `${part.length}:${part}`).join('|');
}
