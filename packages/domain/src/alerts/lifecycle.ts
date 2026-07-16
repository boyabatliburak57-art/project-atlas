import type { Alert, AlertStatus } from './contracts.js';
import { AlertDomainError } from './errors.js';

const allowedTransitions: Readonly<
  Record<AlertStatus, readonly AlertStatus[]>
> = {
  active: ['paused', 'invalid', 'deleted'],
  paused: ['active', 'invalid', 'deleted'],
  invalid: ['active', 'paused', 'deleted'],
  deleted: [],
};

export function canTransitionAlert(
  fromStatus: AlertStatus,
  toStatus: AlertStatus,
): boolean {
  return (
    fromStatus === toStatus || allowedTransitions[fromStatus].includes(toStatus)
  );
}

export function transitionAlert(
  alert: Alert,
  toStatus: AlertStatus,
  transitionedAt: Date,
): Alert {
  if (Number.isNaN(transitionedAt.getTime())) {
    throw new AlertDomainError('ALERT_INVALID', { field: 'transitionedAt' });
  }
  if (alert.status === toStatus) return alert;
  if (!canTransitionAlert(alert.status, toStatus)) {
    throw new AlertDomainError('ALERT_INVALID_TRANSITION', {
      fromStatus: alert.status,
      toStatus,
    });
  }
  return Object.freeze({
    ...alert,
    status: toStatus,
    updatedAt: new Date(transitionedAt),
    deletedAt: toStatus === 'deleted' ? new Date(transitionedAt) : null,
  });
}
