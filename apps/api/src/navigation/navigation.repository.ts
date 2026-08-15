import { userActivityEvents } from '@atlas/database';
import { Injectable } from '@nestjs/common';
import { and, desc, eq, gt, lt, or, sql } from 'drizzle-orm';

import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';

export interface SearchRow {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly subtitle: string | null;
  readonly href: string;
}

@Injectable()
export class NavigationRepository {
  constructor(private readonly connection: ApiDatabase) {}

  async search(
    userId: string,
    query: string,
    types: readonly string[],
    offset: number,
    limit: number,
  ): Promise<readonly SearchRow[]> {
    const pattern = `%${escapeLike(query)}%`;
    const result = await this.connection.pool.query<SearchRow>(
      `
      select id, type, title, subtitle, href
      from (
        select id::text, 'instrument'::text as type, symbol::text as title,
          name::text as subtitle, '/symbols/' || symbol as href, 1 as rank
        from instruments
        where status = 'active' and (normalized_symbol ilike $1 escape '\\'
          or name ilike $1 escape '\\')
        union all
        select id::text, 'watchlist', name, description,
          '/watchlists?selected=' || id::text, 2
        from watchlists
        where owner_user_id = $2 and status = 'active'
          and name ilike $1 escape '\\'
        union all
        select id::text, 'saved_scan', name, description,
          '/scanner?savedScan=' || id::text, 3
        from saved_scans
        where owner_user_id = $2 and status <> 'deleted'
          and name ilike $1 escape '\\'
        union all
        select id::text, 'portfolio', name, description,
          '/portfolios/' || id::text, 4
        from portfolios
        where user_id = $2 and status <> 'deleted'
          and name ilike $1 escape '\\'
        union all
        select id::text, 'strategy', name, description,
          '/strategies/' || id::text, 5
        from strategies
        where owner_user_id = $2 and status <> 'deleted'
          and name ilike $1 escape '\\'
        union all
        select id::text, 'backtest', 'Backtest ' || left(id::text, 8),
          status, '/backtests/' || id::text, 6
        from backtest_runs
        where requested_by = $2
          and id::text ilike $1 escape '\\'
        union all
        select id::text, 'experiment', name, status,
          '/experiments/' || id::text, 7
        from research_experiments
        where owner_user_id = $2 and name ilike $1 escape '\\'
        union all
        select revision_id::text, 'event', title,
          disclosure_type, '/events/' || revision_id::text, 8
        from corporate_disclosure_revisions d
        where d.available_at <= now()
          and d.license_class in ('DISPLAY_ALLOWED', 'DELAYED_DISPLAY_ONLY', 'DERIVED_DISPLAY_ALLOWED')
          and to_tsvector('simple', d.title) @@ plainto_tsquery('simple', $6)
          and not exists (
            select 1 from corporate_disclosure_revisions newer
            where newer.supersedes_revision_id = d.revision_id
          )
      ) searchable
      where type = any($3::text[])
      order by rank, lower(title), id
      offset $4 limit $5
      `,
      [pattern, userId, types, offset, limit, query],
    );
    return result.rows;
  }

  async activity(
    userId: string,
    cursor: { occurredAt: Date; id: string } | null,
    limit: number,
  ) {
    const cursorFilter =
      cursor === null
        ? undefined
        : or(
            lt(userActivityEvents.occurredAt, cursor.occurredAt),
            and(
              eq(userActivityEvents.occurredAt, cursor.occurredAt),
              lt(userActivityEvents.id, cursor.id),
            ),
          );
    return this.connection.database
      .select()
      .from(userActivityEvents)
      .where(
        and(
          eq(userActivityEvents.userId, userId),
          gt(userActivityEvents.expiresAt, new Date()),
          cursorFilter,
        ),
      )
      .orderBy(desc(userActivityEvents.occurredAt), desc(userActivityEvents.id))
      .limit(limit);
  }

  async recordActivity(input: typeof userActivityEvents.$inferInsert) {
    return this.connection.database
      .insert(userActivityEvents)
      .values(input)
      .onConflictDoNothing({
        target: [
          userActivityEvents.userId,
          userActivityEvents.deduplicationKey,
        ],
      })
      .returning();
  }

  async purgeExpired(now: Date): Promise<number> {
    const result = await this.connection.database.execute(sql`
      delete from ${userActivityEvents}
      where ${userActivityEvents.expiresAt} <= ${now}
      returning ${userActivityEvents.id}
    `);
    return result.rows.length;
  }
}

function escapeLike(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_');
}
