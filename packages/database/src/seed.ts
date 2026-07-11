import { sql } from 'drizzle-orm';

import type { Database } from './client';
import { dataProviders } from './schema';

const MANUAL_IMPORT_PROVIDER_ID = '00000000-0000-4000-8000-000000000001';

export async function seedDatabase(database: Database): Promise<void> {
  await database
    .insert(dataProviders)
    .values({
      code: 'manual-import',
      id: MANUAL_IMPORT_PROVIDER_ID,
      name: 'Manual Import',
      status: 'inactive',
    })
    .onConflictDoUpdate({
      set: {
        name: 'Manual Import',
        status: 'inactive',
        updatedAt: sql`now()`,
      },
      target: dataProviders.code,
    });
}
