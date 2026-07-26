import { securityUsers, type Database } from '@atlas/database';
import { and, eq } from 'drizzle-orm';

import type { EmailRecipientResolver } from './contracts';

export class PostgresEmailRecipientResolver implements EmailRecipientResolver {
  constructor(private readonly database: Database) {}

  async resolve(userId: string): Promise<string | null> {
    const [row] = await this.database
      .select({ email: securityUsers.email })
      .from(securityUsers)
      .where(
        and(
          eq(securityUsers.id, userId),
          eq(securityUsers.accountStatus, 'active'),
        ),
      )
      .limit(1);
    return row?.email ?? null;
  }
}
