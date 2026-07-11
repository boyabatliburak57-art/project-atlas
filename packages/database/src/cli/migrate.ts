import 'dotenv/config';

import { createDatabase } from '../client';
import { runMigrations } from '../migration';
import { requireDatabaseUrl } from './environment';

async function main(): Promise<void> {
  const { db, pool } = createDatabase(requireDatabaseUrl());

  try {
    await runMigrations(db);
    process.stdout.write('Database migrations applied successfully.\n');
  } finally {
    await pool.end();
  }
}

void main();
