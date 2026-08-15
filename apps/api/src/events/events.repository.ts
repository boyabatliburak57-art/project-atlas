import { Injectable } from '@nestjs/common';

import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';
import type { EventFeedQuery, EventFeedRow, EventReader } from './events.ports';

@Injectable()
export class PostgresEventReader implements EventReader {
  constructor(private readonly connection: ApiDatabase) {}

  async capability() {
    const result = await this.connection.pool.query<{
      availability: string;
      health: string;
      checked_at: Date;
    }>(`
      select availability, health, checked_at
      from intelligence_provider_capabilities
      where capability = 'disclosure.kap'
      order by case availability when 'SUPPORTED_LIVE' then 0 when 'SUPPORTED_DELAYED' then 1 else 2 end,
        checked_at desc limit 1
    `);
    const row = result.rows[0];
    return row
      ? {
          availability: row.availability,
          health: row.health,
          checkedAt: row.checked_at,
        }
      : {
          availability: 'PROVIDER_REQUIRED',
          health: 'UNAVAILABLE',
          checkedAt: null,
        };
  }

  async feed(query: EventFeedQuery): Promise<readonly EventFeedRow[]> {
    const result = await this.connection.pool.query<EventFeedRow>(feedSql(), [
      query.userId,
      query.categories,
      query.states,
      query.companyId,
      query.symbol,
      query.relevance,
      query.search,
      query.from,
      query.to,
      query.cursor?.publishedAt ?? null,
      query.cursor?.revisionId ?? null,
      query.limit,
      null,
      null,
    ]);
    return result.rows;
  }

  async detail(
    revisionId: string,
    userId: string,
  ): Promise<EventFeedRow | null> {
    const result = await this.connection.pool.query<EventFeedRow>(feedSql(), [
      userId,
      [],
      [],
      null,
      null,
      null,
      null,
      new Date('1970-01-01T00:00:00.000Z'),
      new Date('2999-12-31T23:59:59.999Z'),
      null,
      null,
      1,
      revisionId,
      null,
    ]);
    return result.rows[0] ?? null;
  }

  async revisions(
    disclosureId: string,
    userId: string,
  ): Promise<readonly EventFeedRow[]> {
    const result = await this.connection.pool.query<EventFeedRow>(
      feedSql(false),
      [
        userId,
        [],
        [],
        null,
        null,
        null,
        null,
        new Date('1970-01-01T00:00:00.000Z'),
        new Date('2999-12-31T23:59:59.999Z'),
        null,
        null,
        100,
        null,
        disclosureId,
      ],
    );
    return result.rows;
  }
}

function feedSql(latestOnly = true): string {
  return `
    select
      d.revision_id as "revisionId", d.disclosure_id as "disclosureId",
      coalesce(d.supersedes_revision_id, correction_link.parent_revision_id) as "supersedesRevisionId",
      d.external_disclosure_id as "externalDisclosureId",
      d.provider_revision as "providerRevision", d.title, d.summary,
      d.disclosure_type as "disclosureType",
      case when exists (
        select 1 from corporate_disclosure_revisions lifecycle
        where lifecycle.supersedes_revision_id=d.revision_id
      ) or exists (
        select 1 from corporate_disclosure_revision_links lifecycle_link
        where lifecycle_link.parent_revision_id=d.revision_id
      ) then 'SUPERSEDED' else d.state end as state,
      d.published_at as "publishedAt", d.effective_at as "effectiveAt",
      d.available_at as "availableAt", d.reporting_period as "reportingPeriod",
      d.source_reference as "sourceReference", d.provider_id as "providerId",
      provider.code as "providerCode",
      d.provider_dataset as "providerDataset", d.source_timestamp as "sourceTimestamp",
      d.ingested_at as "ingestedAt", d.delivery_mode as "deliveryMode",
      d.license_class as "licenseClass", d.redistribution_classes as "redistributionClasses",
      d.quality_state as "qualityState", d.normalized_attributes as "normalizedAttributes",
      coalesce(rel.company_ids, '{}'::uuid[]) as "companyIds",
      coalesce(rel.company_names, '{}'::text[]) as "companyNames",
      coalesce(rel.instrument_ids, '{}'::uuid[]) as "instrumentIds",
      coalesce(rel.symbols, '{}'::text[]) as symbols,
      coalesce(rel.watchlist_relevant, false) as "watchlistRelevant",
      coalesce(rel.portfolio_relevant, false) as "portfolioRelevant",
      e.revision_id as "marketEventRevisionId"
    from corporate_disclosure_revisions d
    join data_providers provider on provider.id=d.provider_id
    left join corporate_disclosure_revision_links correction_link
      on correction_link.child_revision_id=d.revision_id
    left join lateral (
      select
        array_remove(array_agg(distinct c.id), null) as company_ids,
        array_remove(array_agg(distinct c.canonical_name), null) as company_names,
        array_remove(array_agg(distinct i.id), null) as instrument_ids,
        array_remove(array_agg(distinct i.symbol), null) as symbols,
        bool_or(exists (
          select 1 from watchlist_items wi join watchlists w on w.id=wi.watchlist_id
          where w.owner_user_id=$1 and w.status='active' and wi.instrument_id=i.id
        )) as watchlist_relevant,
        bool_or(exists (
          select 1 from portfolio_positions pp join portfolios p on p.id=pp.portfolio_id
          where p.user_id=$1 and p.status <> 'deleted' and pp.instrument_id=i.id
        )) as portfolio_relevant
      from corporate_disclosure_entities de
      left join intelligence_companies c on c.id=de.company_id
      left join instruments i on i.id=de.instrument_id
      where de.disclosure_revision_id=d.revision_id
    ) rel on true
    left join intelligence_market_events e
      on e.revision_id=d.revision_id and e.provider_id=d.provider_id
    where d.license_class in ('DISPLAY_ALLOWED','DELAYED_DISPLAY_ONLY','DERIVED_DISPLAY_ALLOWED')
      and d.available_at <= now()
      and ($13::uuid is null or d.revision_id=$13)
      and ($14::uuid is null or d.disclosure_id=$14)
      and (cardinality($2::text[])=0 or d.disclosure_type=any($2::text[]))
      and (
        cardinality($3::text[])=0
        or (
          d.state=any($3::text[])
          and (
            d.state <> 'ACTIVE'
            or (
              not exists (select 1 from corporate_disclosure_revisions state_newer where state_newer.supersedes_revision_id=d.revision_id)
              and not exists (select 1 from corporate_disclosure_revision_links state_newer_link where state_newer_link.parent_revision_id=d.revision_id)
            )
          )
        )
        or (
          'SUPERSEDED'=any($3::text[])
          and (
            exists (select 1 from corporate_disclosure_revisions state_newer where state_newer.supersedes_revision_id=d.revision_id)
            or exists (select 1 from corporate_disclosure_revision_links state_newer_link where state_newer_link.parent_revision_id=d.revision_id)
          )
        )
      )
      and ($4::uuid is null or $4=any(coalesce(rel.company_ids, '{}'::uuid[])))
      and ($5::text is null or upper($5)=any(coalesce(rel.symbols, '{}'::text[])))
      and ($6::text is null
        or ($6 in ('WATCHLIST','ANY') and rel.watchlist_relevant)
        or ($6 in ('PORTFOLIO','ANY') and rel.portfolio_relevant))
      and ($7::text is null or to_tsvector('simple', d.title || ' ' || array_to_string(coalesce(rel.company_names, '{}'::text[]), ' ') || ' ' || array_to_string(coalesce(rel.symbols, '{}'::text[]), ' ')) @@ plainto_tsquery('simple', $7))
      and d.published_at >= $8 and d.published_at <= $9
      and ($10::timestamptz is null or (d.published_at, d.revision_id) < ($10, $11::uuid))
      ${
        latestOnly
          ? `and not exists (select 1 from corporate_disclosure_revisions newer where newer.supersedes_revision_id=d.revision_id)
        and not exists (select 1 from corporate_disclosure_revision_links newer_link where newer_link.parent_revision_id=d.revision_id)`
          : ''
      }
    order by d.published_at desc, d.revision_id desc
    limit $12
  `;
}
