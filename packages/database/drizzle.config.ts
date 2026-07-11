import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://localhost/atlas',
  },
  dialect: 'postgresql',
  out: './drizzle',
  schema: './src/schema/index.ts',
  strict: true,
  verbose: true,
});
