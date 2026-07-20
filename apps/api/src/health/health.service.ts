import {
  BeforeApplicationShutdown,
  Injectable,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';

export type ApiHealthStatus = 'live' | 'not_ready' | 'ready' | 'started';

@Injectable()
export class HealthService
  implements OnApplicationBootstrap, BeforeApplicationShutdown
{
  private acceptingTraffic = true;
  private started = false;

  constructor(
    private readonly config: ConfigService,
    private readonly database: ApiDatabase,
  ) {}

  onApplicationBootstrap(): void {
    this.started = true;
  }

  beforeApplicationShutdown(): void {
    this.acceptingTraffic = false;
  }

  live(): ApiHealthStatus {
    return 'live';
  }

  startup(): ApiHealthStatus {
    return this.started ? 'started' : 'not_ready';
  }

  async ready(): Promise<ApiHealthStatus> {
    if (!this.started || !this.acceptingTraffic) return 'not_ready';
    if (!this.config.get<boolean>('HEALTH_CHECK_DATABASE', false))
      return 'ready';

    try {
      await withTimeout(this.database.ping(), 2_000);
      return 'ready';
    } catch {
      return 'not_ready';
    }
  }

  beginDrain(): void {
    this.acceptingTraffic = false;
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error('health check timeout')),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
