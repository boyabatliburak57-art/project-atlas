import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { migrate } from 'drizzle-orm/node-postgres/migrator';

import type { Database } from './client';

export function migrationFolder(): string {
  const sourceLocation = resolve(__dirname, '../drizzle');
  return existsSync(sourceLocation)
    ? sourceLocation
    : resolve(__dirname, '../../drizzle');
}

export async function runMigrations(
  database: Database,
  migrationsFolder = migrationFolder(),
): Promise<void> {
  await migrate(database, { migrationsFolder });
}
