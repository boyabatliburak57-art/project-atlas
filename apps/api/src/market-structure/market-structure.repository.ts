import { Injectable } from '@nestjs/common';
import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';
import type {
  MarketStructureReader,
  MeasureQuery,
} from './market-structure.ports';

@Injectable()
export class PostgresMarketStructureReader implements MarketStructureReader {
  constructor(private readonly connection: ApiDatabase) {}

  async capability(
    capability:
      | 'marketMeasure.restrictions'
      | 'marketMeasure.shortSelling'
      | 'marketMeasure.history',
  ) {
    const row = (
      await this.connection.pool.query<{
        availability: string;
        health: string;
        checked_at: Date;
      }>(
        `
      select availability, health, checked_at
      from intelligence_provider_capabilities
      where capability=$1
      order by case availability when 'SUPPORTED_LIVE' then 0 when 'SUPPORTED_DELAYED' then 1 else 2 end, checked_at desc
      limit 1`,
        [capability],
      )
    ).rows[0];
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

  async measures(query: MeasureQuery) {
    const result = await this.connection.pool.query<Record<string, unknown>>(
      `
      select m.revision_id as "revisionId", m.measure_id as "measureId", e.revision_id as "marketEventId", i.id as "instrumentId", i.symbol, i.name as "instrumentName",
        m.type as "measureType",
        case
          when m.status in ('CORRECTED','SUPERSEDED','CANCELLED') then m.status
          when $6::timestamptz < m.effective_from then 'SCHEDULED'
          when m.effective_until is not null and $6::timestamptz > m.effective_until then 'EXPIRED'
          else 'ACTIVE'
        end as status,
        m.published_at as "publishedAt", m.available_at as "availableAt", m.effective_from as "effectiveFrom", m.effective_until as "effectiveUntil",
        case when m.source_reference like 'https://%' then m.source_reference else null end as "sourceReference",
        m.structured_attributes as "structuredAttributes", p.code as provider, m.provider_dataset as "providerDataset",
        m.delivery_mode as "deliveryMode", m.quality_state as quality, m.license_class as "licenseClass",
        m.redistribution_classes as "redistributionClasses"
      from intelligence_market_measures m
      join instruments i on i.id=m.instrument_id
      join data_providers p on p.id=m.provider_id
      left join intelligence_market_events e on e.revision_id=m.revision_id and e.provider_id=m.provider_id
      where m.available_at <= $6
        and m.license_class in ('DISPLAY_ALLOWED','DELAYED_DISPLAY_ONLY','DERIVED_DISPLAY_ALLOWED')
        and ($1::text is null or i.normalized_symbol=$1)
        and (cardinality($2::text[])=0 or m.type=any($2::text[]))
        and ($7::text = 'ACTIVE' or (m.published_at >= $3 and m.published_at <= $4))
        and not exists (select 1 from intelligence_market_measures newer where newer.supersedes_revision_id=m.revision_id and newer.available_at <= $6)
        and ($7::text <> 'ACTIVE' or (m.status not in ('CORRECTED','SUPERSEDED','CANCELLED') and m.effective_from <= $6 and (m.effective_until is null or m.effective_until >= $6)))
        and (cardinality($8::text[])=0 or (case when m.status in ('CORRECTED','SUPERSEDED','CANCELLED') then m.status when $6 < m.effective_from then 'SCHEDULED' when m.effective_until is not null and $6 > m.effective_until then 'EXPIRED' else 'ACTIVE' end)=any($8::text[]))
        and ($9::timestamptz is null or (m.published_at, m.revision_id) < ($9::timestamptz, $10::uuid))
      order by m.published_at desc, m.revision_id desc limit $5`,
      [
        query.symbol,
        query.types,
        query.from,
        query.to,
        query.limit,
        query.availableAt,
        query.mode,
        query.statuses,
        query.cursor?.publishedAt ?? null,
        query.cursor?.revisionId ?? null,
      ],
    );
    return result.rows;
  }

  async event(revisionId: string) {
    return (
      (
        await this.connection.pool.query<Record<string, unknown>>(
          `select e.revision_id as "revisionId", e.event_id as "eventId", e.event_type as "eventType",
          e.entity_type as "entityType", e.entity_id as "entityId", i.symbol, i.name as "instrumentName",
          e.occurred_at as "occurredAt", e.published_at as "publishedAt", e.effective_at as "effectiveAt",
          e.available_at as "availableAt", e.source_reference as "sourceReference", e.methodology_version as "methodologyVersion",
          e.attributes, p.code as provider, e.provider_dataset as "providerDataset", e.delivery_mode as "deliveryMode",
          e.quality_state as quality, e.license_class as "licenseClass", e.redistribution_classes as "redistributionClasses"
        from intelligence_market_events e
        join intelligence_market_measures m on m.revision_id=e.revision_id and m.provider_id=e.provider_id
        join instruments i on i.id=m.instrument_id
        join data_providers p on p.id=e.provider_id
        where e.revision_id=$1 and e.available_at <= now()
          and e.license_class in ('DISPLAY_ALLOWED','DELAYED_DISPLAY_ONLY','DERIVED_DISPLAY_ALLOWED')
        limit 1`,
          [revisionId],
        )
      ).rows[0] ?? null
    );
  }

  async shortSelling(input: {
    symbol: string;
    from: string;
    to: string;
    limit: number;
  }) {
    return (
      await this.connection.pool.query<Record<string, unknown>>(
        `
      select s.revision_id as "revisionId", i.id as "instrumentId", i.symbol, s.trade_date as "tradeDate", s.session,
        s.quantity, s.value, s.share_of_turnover as "shareOfTurnover", s.data_cutoff as "dataCutoff", s.available_at as "availableAt",
        p.code as provider, s.delivery_mode as "deliveryMode", s.quality_state as quality, s.license_class as "licenseClass"
      from short_selling_activity_observations s join instruments i on i.id=s.instrument_id join data_providers p on p.id=s.provider_id
      where i.normalized_symbol=$1 and s.trade_date between $2 and $3 and s.available_at <= now()
        and s.license_class in ('DISPLAY_ALLOWED','DELAYED_DISPLAY_ONLY','DERIVED_DISPLAY_ALLOWED')
        and not exists (select 1 from short_selling_activity_observations newer where newer.supersedes_revision_id=s.revision_id and newer.available_at <= now())
      order by s.trade_date desc, s.revision_id desc limit $4`,
        [input.symbol, input.from, input.to, input.limit],
      )
    ).rows;
  }
}
