import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    hookTimeout: 30_000,
    include: ['src/**/*.integration.test.ts'],
    sequence: { concurrent: false },
  },
});
