import 'dotenv/config';

import { createDatabase } from '../client';
import { requireDatabaseUrl } from './environment';
import { seedDatabase } from '../seed';

async function main(): Promise<void> {
  const { db, pool } = createDatabase(requireDatabaseUrl());

  try {
    await seedDatabase(db);
    process.stdout.write('Database seed applied successfully.\n');
  } finally {
    await pool.end();
  }
}

void main();
