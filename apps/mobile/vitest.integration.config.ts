import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'expo-secure-store': resolve(
        import.meta.dirname,
        'src/test/expo-secure-store.mock.ts',
      ),
    },
  },
  test: {
    include: ['src/**/*.integration.test.ts'],
  },
});
