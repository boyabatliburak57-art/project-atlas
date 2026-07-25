import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema';

export interface DatabasePoolError {
  readonly code: string | undefined;
  readonly message: string;
}

export function createDatabase(
  databaseUrl: string,
  options: {
    readonly onPoolError?: (error: DatabasePoolError) => void;
  } = {},
) {
  const pool = new Pool({ connectionString: databaseUrl });
  pool.on('error', (error: Error & { readonly code?: string }) => {
    options.onPoolError?.({ code: error.code, message: error.message });
  });
  return {
    db: drizzle(pool, { schema }),
    pool,
  };
}

export type Database = ReturnType<typeof createDatabase>['db'];
