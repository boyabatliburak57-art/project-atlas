import type { CacheBackend } from '@atlas/domain';

export interface RedisCacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: 'EX', ttl: number): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
  scan(
    cursor: string,
    match: 'MATCH',
    pattern: string,
    count: 'COUNT',
    amount: number,
  ): Promise<[string, string[]]>;
}

export class RedisMarketIntelligenceCacheBackend implements CacheBackend {
  constructor(private readonly redis: RedisCacheClient) {}

  get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, value, 'EX', ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async invalidateScopes(scopes: readonly string[]): Promise<number> {
    if (scopes.length === 0) return 0;
    let cursor = '0';
    let deleted = 0;
    do {
      const [next, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        'atlas:market-intelligence:v1:*',
        'COUNT',
        100,
      );
      cursor = next;
      if (keys.length > 0) deleted += await this.redis.del(...keys);
    } while (cursor !== '0');
    return deleted;
  }
}

export class NoopMarketIntelligenceCacheBackend implements CacheBackend {
  get(): Promise<null> {
    return Promise.resolve(null);
  }
  set(): Promise<void> {
    return Promise.resolve();
  }
  delete(): Promise<void> {
    return Promise.resolve();
  }
  invalidateScopes(): Promise<number> {
    return Promise.resolve(0);
  }
}
