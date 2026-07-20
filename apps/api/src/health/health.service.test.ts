import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';

import type { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('separates startup, readiness and drain state without exposing dependencies', async () => {
    const ping = vi.fn().mockResolvedValue(undefined);
    const service = new HealthService(
      new ConfigService({ HEALTH_CHECK_DATABASE: true }),
      { ping } as unknown as ApiDatabase,
    );

    expect(service.startup()).toBe('not_ready');
    expect(await service.ready()).toBe('not_ready');
    service.onApplicationBootstrap();
    expect(service.startup()).toBe('started');
    expect(await service.ready()).toBe('ready');
    expect(ping).toHaveBeenCalledTimes(1);
    service.beginDrain();
    expect(await service.ready()).toBe('not_ready');
  });

  it('reports not ready when the required database check fails', async () => {
    const service = new HealthService(
      new ConfigService({ HEALTH_CHECK_DATABASE: true }),
      {
        ping: vi.fn().mockRejectedValue(new Error('private hostname')),
      } as unknown as ApiDatabase,
    );
    service.onApplicationBootstrap();

    expect(await service.ready()).toBe('not_ready');
  });
});
