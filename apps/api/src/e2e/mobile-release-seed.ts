import { createDatabase, securityUsers } from '@atlas/database';
import { eq } from 'drizzle-orm';

import { hashPassword } from '../security/security-crypto';

const E2E_USER_ID = '00000000-0000-4000-8000-000000000100';
const E2E_EMAIL = 'mobile@example.test';

async function main(): Promise<void> {
  assertTestOnlyEnvironment(process.env);
  const databaseUrl = required('DATABASE_URL');
  const password = required('ATLAS_MOBILE_E2E_PASSWORD');
  const { db, pool } = createDatabase(databaseUrl);
  try {
    const passwordHash = await hashPassword(password);
    const existing = await db
      .select({ id: securityUsers.id })
      .from(securityUsers)
      .where(eq(securityUsers.normalizedEmail, E2E_EMAIL))
      .limit(1);
    const user = existing[0];
    if (user === undefined) {
      await db.insert(securityUsers).values({
        accountStatus: 'active',
        email: E2E_EMAIL,
        emailVerifiedAt: new Date(),
        id: E2E_USER_ID,
        normalizedEmail: E2E_EMAIL,
        passwordHash,
        roles: [],
      });
    } else {
      await db
        .update(securityUsers)
        .set({
          accountStatus: 'active',
          emailVerifiedAt: new Date(),
          passwordHash,
          roles: [],
          sessionVersion: 1,
          updatedAt: new Date(),
        })
        .where(eq(securityUsers.id, user.id));
    }
    process.stdout.write('Local mobile release E2E account ready.\n');
  } finally {
    await pool.end();
  }
}

export function assertTestOnlyEnvironment(
  environment: NodeJS.ProcessEnv,
): void {
  if (
    environment['ATLAS_MOBILE_E2E_FIXTURE'] !== '1' ||
    !['local', 'test'].includes(environment['ATLAS_ENV'] ?? '')
  )
    throw new Error('MOBILE_E2E_SEED_DISABLED');
  const databaseUrl = new URL(requiredFrom(environment, 'DATABASE_URL'));
  if (!['localhost', '127.0.0.1'].includes(databaseUrl.hostname))
    throw new Error('MOBILE_E2E_LOCAL_DATABASE_REQUIRED');
}

function required(key: string): string {
  return requiredFrom(process.env, key);
}

function requiredFrom(environment: NodeJS.ProcessEnv, key: string): string {
  const value = environment[key];
  if (value === undefined || value.length === 0)
    throw new Error(`${key}_REQUIRED`);
  return value;
}

if (require.main === module) void main();
