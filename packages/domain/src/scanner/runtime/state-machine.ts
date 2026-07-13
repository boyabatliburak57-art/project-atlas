import type { ScanRunStatus } from './contracts.js';
import { ScanRunApplicationError } from './errors.js';

const transitions: Readonly<Record<ScanRunStatus, readonly ScanRunStatus[]>> = {
  queued: ['running', 'failed', 'cancel_requested'],
  running: ['completed', 'failed', 'cancel_requested'],
  cancel_requested: ['cancelled', 'failed'],
  completed: ['expired'],
  failed: ['expired'],
  cancelled: ['expired'],
  expired: [],
};

export function assertScanRunTransition(
  fromStatus: ScanRunStatus,
  toStatus: ScanRunStatus,
): void {
  if (!transitions[fromStatus].includes(toStatus)) {
    throw new ScanRunApplicationError('SCAN_RUN_INVALID_TRANSITION', {
      fromStatus,
      toStatus,
    });
  }
}

export function isTerminalScanRunStatus(status: ScanRunStatus): boolean {
  return (
    status === 'completed' ||
    status === 'failed' ||
    status === 'cancelled' ||
    status === 'expired'
  );
}
