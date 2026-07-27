import { describe, expect, it } from 'vitest';

import { parseEnvironment } from './environment';

describe('parseEnvironment', () => {
  it('parses Redis and applies worker defaults', () => {
    expect(
      parseEnvironment({
        DATABASE_URL: 'postgresql://atlas:local@localhost:5432/atlas',
        REDIS_URL: 'redis://localhost:6379',
      }),
    ).toEqual({
      ATLAS_ENV: 'local',
      CONFIG_SCHEMA_VERSION: '1',
      DATABASE_URL: 'postgresql://atlas:local@localhost:5432/atlas',
      EMAIL_PROVIDER_MODE: 'sandbox',
      BORSA_API_ALLOW_IN_PRODUCTION: false,
      BORSA_API_ENABLED: false,
      BORSA_API_MAX_CONCURRENCY: 2,
      BORSA_API_REQUESTS_PER_SECOND: 1,
      BORSA_API_TIMEOUT_MS: 10_000,
      MARKET_DATA_PROVIDER_MODE: 'disabled',
      NODE_ENV: 'development',
      OTEL_TRACE_SAMPLE_RATIO: 0.1,
      REDIS_URL: 'redis://localhost:6379',
      RELEASE_COMMIT_SHA: 'development',
      RELEASE_VERSION: 'development',
      TELEMETRY_POLICY_VERSION: 'telemetry-v1',
      WORKER_CONCURRENCY: 2,
      WORKER_DEBUG: false,
      WORKER_HEALTH_FILE: '',
      WORKER_HEARTBEAT_INTERVAL_MS: 30_000,
      WORKER_LOG_LEVEL: 'info',
      WORKER_ROLE: 'all',
      BACKTEST_EVENT_BATCH_SIZE: 250,
      BACKTEST_RUN_TIMEOUT_MS: 600_000,
      SCANNER_BATCH_SIZE: 100,
      SCANNER_BATCH_TIMEOUT_MS: 30_000,
      SCANNER_RUN_TIMEOUT_MS: 300_000,
      WORKER_STARTUP_TIMEOUT_MS: 10_000,
    });
  });

  it('fails fast for a non-Redis URL', () => {
    expect(() =>
      parseEnvironment({
        DATABASE_URL: 'postgresql://atlas:local@localhost:5432/atlas',
        REDIS_URL: 'https://localhost',
      }),
    ).toThrow('Invalid worker environment: REDIS_URL');
  });

  it('fails fast for missing production object-storage secrets', () => {
    expect(() =>
      parseEnvironment({
        ATLAS_ENV: 'production',
        DATABASE_URL: 'postgresql://atlas:secret@database:5432/atlas',
        REDIS_URL: 'rediss://redis:6379',
        RELEASE_COMMIT_SHA: '1234567890abcdef',
        RELEASE_VERSION: '1.0.0',
        WORKER_HEALTH_FILE: '/tmp/atlas-worker-ready',
      }),
    ).toThrow('OBJECT_STORAGE_ACCESS_KEY_ID');
  });

  it('rejects an unknown production process role', () => {
    expect(() =>
      parseEnvironment({
        DATABASE_URL: 'postgresql://atlas:local@localhost:5432/atlas',
        REDIS_URL: 'redis://localhost:6379',
        WORKER_ROLE: 'everything',
      }),
    ).toThrow('Invalid worker environment: WORKER_ROLE');
  });

  it('requires provider metadata when a deployed provider mode is enabled', () => {
    expect(() =>
      parseEnvironment({
        ATLAS_ENV: 'production',
        DATABASE_URL: 'postgresql://atlas:local@localhost:5432/atlas',
        REDIS_URL: 'rediss://redis:6379',
        OBJECT_STORAGE_ACCESS_KEY_ID: 'reference-only',
        OBJECT_STORAGE_BUCKET: 'atlas',
        OBJECT_STORAGE_ENDPOINT: 'https://objects.invalid',
        OBJECT_STORAGE_SECRET_ACCESS_KEY: 'reference-only',
        RELEASE_COMMIT_SHA: '1234567890abcdef',
        RELEASE_VERSION: '1.0.0',
        TELEMETRY_POLICY_VERSION: 'telemetry-v1',
        WORKER_HEALTH_FILE: '/tmp/atlas-worker-ready',
        MARKET_DATA_PROVIDER_MODE: 'production',
      }),
    ).toThrow('MARKET_DATA_PROVIDER_CODE');
  });

  it('fails fast when borsa-api is selected in production', () => {
    expect(() =>
      parseEnvironment({
        ATLAS_ENV: 'production',
        DATABASE_URL: 'postgresql://atlas:local@localhost:5432/atlas',
        REDIS_URL: 'rediss://redis:6379',
        OBJECT_STORAGE_ACCESS_KEY_ID: 'reference-only',
        OBJECT_STORAGE_BUCKET: 'atlas',
        OBJECT_STORAGE_ENDPOINT: 'https://objects.invalid',
        OBJECT_STORAGE_SECRET_ACCESS_KEY: 'reference-only',
        RELEASE_COMMIT_SHA: '1234567890abcdef',
        RELEASE_VERSION: '1.0.0',
        TELEMETRY_POLICY_VERSION: 'telemetry-v1',
        WORKER_HEALTH_FILE: '/tmp/atlas-worker-ready',
        MARKET_DATA_PROVIDER: 'borsa-api',
        BORSA_API_ENABLED: 'true',
        BORSA_API_ALLOW_IN_PRODUCTION: 'true',
      }),
    ).toThrow('SANDBOX_INTEGRATION');
  });
});
