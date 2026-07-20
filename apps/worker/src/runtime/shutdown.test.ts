import { EventEmitter } from 'node:events';

import { describe, expect, it, vi } from 'vitest';

import type { StructuredLogger } from '../observability/structured-logger';
import { installShutdownHandlers } from './shutdown';
import type { WorkerRuntime } from './worker-runtime';

describe('worker graceful shutdown', () => {
  it('drains exactly once when SIGTERM is delivered repeatedly', async () => {
    const processEmitter = process as EventEmitter;
    const stop = vi.fn().mockResolvedValue(undefined);
    const remove = installShutdownHandlers(
      { stop } as unknown as WorkerRuntime,
      { error: vi.fn() } as unknown as StructuredLogger,
    );

    try {
      processEmitter.emit('SIGTERM', 'SIGTERM');
      processEmitter.emit('SIGTERM', 'SIGTERM');
      await vi.waitFor(() => expect(stop).toHaveBeenCalledTimes(1));
      expect(stop).toHaveBeenCalledWith('SIGTERM');
    } finally {
      remove();
    }
  });
});
