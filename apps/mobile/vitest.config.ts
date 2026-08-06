import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'expo-secure-store': resolve(
        import.meta.dirname,
        'src/test/expo-secure-store.mock.ts',
      ),
      'expo-local-authentication': resolve(
        import.meta.dirname,
        'src/test/expo-local-authentication.mock.ts',
      ),
    },
  },
  test: {
    exclude: ['src/**/*.integration.test.ts', '**/node_modules/**'],
  },
});
