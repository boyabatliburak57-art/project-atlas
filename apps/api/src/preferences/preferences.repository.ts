import { userPreferences } from '@atlas/database';
import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';

@Injectable()
export class PreferencesRepository {
  constructor(private readonly connection: ApiDatabase) {}

  async find(userId: string) {
    return (
      (
        await this.connection.database
          .select()
          .from(userPreferences)
          .where(eq(userPreferences.userId, userId))
          .limit(1)
      )[0] ?? null
    );
  }

  async create(userId: string, values: Record<string, unknown>) {
    return (
      (
        await this.connection.database
          .insert(userPreferences)
          .values({ userId, version: 2, ...values })
          .onConflictDoNothing()
          .returning()
      )[0] ?? null
    );
  }

  async update(
    userId: string,
    expectedVersion: number,
    values: Record<string, unknown>,
  ) {
    return (
      (
        await this.connection.database
          .update(userPreferences)
          .set({
            ...values,
            version: sql`${userPreferences.version} + 1`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(userPreferences.userId, userId),
              eq(userPreferences.version, expectedVersion),
            ),
          )
          .returning()
      )[0] ?? null
    );
  }
}
