import { Injectable } from '@nestjs/common';

import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';
import type { InstitutionalReader } from './institutional.ports';

@Injectable()
export class PostgresInstitutionalReader implements InstitutionalReader {
  constructor(private readonly connection: ApiDatabase) {}

  async searchInstitutions(query: string, limit: number) {
    const result = await this.connection.pool.query(
      `select id, canonical_name as "canonicalName", short_name as "shortName",
              code, type, active, valid_from as "validFrom", valid_to as "validTo"
         from intelligence_institutions
        where lower(canonical_name) like $1 escape '\\'
           or lower(coalesce(short_name, '')) like $1 escape '\\'
           or lower(coalesce(code, '')) = $2
        order by active desc, canonical_name asc, id asc
        limit $3`,
      [
        `%${escapeLike(query.toLocaleLowerCase('tr-TR'))}%`,
        query.toLowerCase(),
        limit,
      ],
    );
    return result.rows as readonly Record<string, unknown>[];
  }

  async overview(input: Parameters<InstitutionalReader['overview']>[0]) {
    const base = `
      with selected_sessions as (
        select distinct trade_date from institutional_flow_observations
         where trade_date between $1 and $2 order by trade_date desc
         limit coalesce($4::int, 2147483647)
      ), latest as (
        select f.* from institutional_flow_observations f
        join selected_sessions sessions on sessions.trade_date = f.trade_date
        where true
          and not exists (
            select 1 from institutional_flow_observations newer
             where newer.supersedes_revision_id = f.revision_id
          )
      ), ranked as (
        select i.id as "institutionId", i.canonical_name as "institutionName",
               i.code, sum(latest.buy_value)::text as "buyValue",
               sum(latest.sell_value)::text as "sellValue",
               sum(latest.net_value)::text as "netValue",
               count(distinct latest.instrument_id)::int as "instrumentCount",
               min(latest.available_at) as "availableAt",
               max(latest.data_cutoff) as "dataCutoff",
               max(latest.coverage_ratio)::text as "coverageRatio",
               max(latest.provider_dataset) as "providerDataset",
               count(*)::int as "observationCount"
          from latest join intelligence_institutions i on i.id = latest.institution_id
         group by i.id, i.canonical_name, i.code
      ) select * from ranked order by "netValue"::numeric`;
    const [buyers, sellers] = await Promise.all([
      this.connection.pool.query(
        `${base} desc nulls last, "institutionId" limit $3`,
        [input.from, input.to, input.limit, input.tradingSessionLimit],
      ),
      this.connection.pool.query(
        `${base} asc nulls last, "institutionId" limit $3`,
        [input.from, input.to, input.limit, input.tradingSessionLimit],
      ),
    ]);
    return { topBuyers: buyers.rows, topSellers: sellers.rows };
  }

  async instrumentFlow(
    input: Parameters<InstitutionalReader['instrumentFlow']>[0],
  ) {
    const order = {
      NET_BUY: 'sum(latest.net_value) desc nulls last',
      NET_SELL: 'sum(latest.net_value) asc nulls last',
      BUY_VALUE: 'sum(latest.buy_value) desc nulls last',
      SELL_VALUE: 'sum(latest.sell_value) desc nulls last',
    }[input.sort];
    const result = await this.connection.pool.query(
      `with selected_sessions as (
         select distinct f.trade_date
           from institutional_flow_observations f
           join instruments ins on ins.id = f.instrument_id
          where ins.symbol = $1 and f.trade_date between $2 and $3
          order by f.trade_date desc
          limit coalesce($6::int, 2147483647)
       ), latest as (
         select f.* from institutional_flow_observations f
          join instruments ins on ins.id = f.instrument_id
          join selected_sessions sessions on sessions.trade_date = f.trade_date
         where ins.symbol = $1
           and ($4::uuid is null or f.institution_id > $4::uuid)
           and not exists (select 1 from institutional_flow_observations n where n.supersedes_revision_id = f.revision_id)
       )
       select i.id as "institutionId", i.canonical_name as "institutionName", i.code,
              sum(latest.buy_quantity)::text as "buyQuantity",
              sum(latest.sell_quantity)::text as "sellQuantity",
              sum(latest.net_quantity)::text as "netQuantity",
              sum(latest.buy_value)::text as "buyValue",
              sum(latest.sell_value)::text as "sellValue",
              sum(latest.net_value)::text as "netValue",
              to_char(max(latest.trade_date), 'YYYY-MM-DD') as "tradeDate", max(latest.available_at) as "availableAt",
              max(latest.data_cutoff) as "dataCutoff", max(latest.currency) as currency,
              max(latest.quality_state) as quality,
              max(latest.delivery_mode) as "deliveryMode",
              max(latest.license_class) as "licenseClass",
              max(latest.coverage_ratio)::text as "coverageRatio",
              max(latest.provider_dataset) as "providerDataset",
              max(p.code) as provider
         from latest join intelligence_institutions i on i.id = latest.institution_id
         join data_providers p on p.id = latest.provider_id
        group by i.id, i.canonical_name, i.code
        order by ${order}, i.id limit $5`,
      [
        input.symbol,
        input.from,
        input.to,
        input.afterInstitutionId,
        input.limit,
        input.tradingSessionLimit,
      ],
    );
    return result.rows as readonly Record<string, unknown>[];
  }

  async institution(id: string) {
    const result = await this.connection.pool.query(
      `select id, canonical_name as "canonicalName", short_name as "shortName", code,
              type, active, valid_from as "validFrom", valid_to as "validTo"
         from intelligence_institutions where id = $1 limit 1`,
      [id],
    );
    return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
  }

  async institutionFlows(
    input: Parameters<InstitutionalReader['institutionFlows']>[0],
  ) {
    const result = await this.connection.pool.query(
      `with selected_sessions as (
        select distinct trade_date from institutional_flow_observations
         where institution_id = $1 and trade_date between $2 and $3
         order by trade_date desc limit coalesce($5::int, 2147483647)
      ), latest as (
        select f.* from institutional_flow_observations f
         join selected_sessions sessions on sessions.trade_date = f.trade_date
         where f.institution_id = $1
           and not exists (select 1 from institutional_flow_observations n where n.supersedes_revision_id = f.revision_id)
      )
      select ins.id as "instrumentId", ins.symbol,
             sum(latest.buy_value)::text as "buyValue", sum(latest.sell_value)::text as "sellValue",
             sum(latest.net_value)::text as "netValue", count(*)::int as "observationCount",
             to_char(max(latest.trade_date), 'YYYY-MM-DD') as "tradeDate", max(latest.available_at) as "availableAt",
             max(latest.coverage_ratio)::text as "coverageRatio",
             max(latest.provider_dataset) as "providerDataset", max(p.code) as provider
        from latest join instruments ins on ins.id = latest.instrument_id
        join data_providers p on p.id = latest.provider_id
       group by ins.id, ins.symbol order by sum(latest.net_value) desc nulls last, ins.id limit $4`,
      [
        input.institutionId,
        input.from,
        input.to,
        input.limit,
        input.tradingSessionLimit,
      ],
    );
    return result.rows as readonly Record<string, unknown>[];
  }

  async settlement(input: Parameters<InstitutionalReader['settlement']>[0]) {
    const order = {
      HOLDING: 's.holding_quantity desc nulls last',
      INCREASE: 's.change_quantity desc nulls last',
      DECREASE: 's.change_quantity asc nulls last',
    }[input.sort];
    const result = await this.connection.pool.query(
      `with target_date as (
         select coalesce($2::date, max(s.settlement_date)) as value
           from settlement_snapshots s join instruments ins on ins.id = s.instrument_id
          where ins.symbol = $1
       )
       select s.revision_id as id, i.id as "institutionId", i.canonical_name as "institutionName", i.code,
              to_char(s.settlement_date, 'YYYY-MM-DD') as "settlementDate",
              to_char(s.trade_date, 'YYYY-MM-DD') as "tradeDate",
              s.holding_quantity::text as "holdingQuantity", s.holding_ratio::text as "holdingRatio",
              s.change_quantity::text as "changeQuantity", s.change_ratio::text as "changeRatio",
              s.residency, s.available_at as "availableAt", s.data_cutoff as "dataCutoff",
              s.quality_state as quality, s.delivery_mode as "deliveryMode", s.license_class as "licenseClass",
              s.coverage_ratio::text as "coverageRatio", s.provider_dataset as "providerDataset",
              s.provider_revision as "providerRevision", p.code as provider
         from settlement_snapshots s
         join instruments ins on ins.id = s.instrument_id
         join intelligence_institutions i on i.id = s.institution_id
         join data_providers p on p.id = s.provider_id
         join target_date d on d.value = s.settlement_date
        where ins.symbol = $1
          and ($4::text is null or s.residency = $4::text)
          and not exists (select 1 from settlement_snapshots n where n.supersedes_revision_id = s.revision_id)
        order by ${order}, i.id limit $3`,
      [input.symbol, input.settlementDate, input.limit, input.residency],
    );
    return result.rows as readonly Record<string, unknown>[];
  }

  async institutionHoldings(
    input: Parameters<InstitutionalReader['institutionHoldings']>[0],
  ) {
    const result = await this.connection.pool.query(
      `with latest_dates as (
         select instrument_id, coalesce($2::date, max(settlement_date)) as settlement_date
           from settlement_snapshots where institution_id = $1 group by instrument_id
       )
       select ins.id as "instrumentId", ins.symbol,
              to_char(s.settlement_date, 'YYYY-MM-DD') as "settlementDate",
              s.holding_quantity::text as "holdingQuantity", s.holding_ratio::text as "holdingRatio",
              s.change_quantity::text as "changeQuantity", s.change_ratio::text as "changeRatio",
              s.residency, s.available_at as "availableAt", s.quality_state as quality,
              s.coverage_ratio::text as "coverageRatio", s.provider_dataset as "providerDataset",
              s.provider_revision as "providerRevision", p.code as provider
         from settlement_snapshots s
         join latest_dates d on d.instrument_id = s.instrument_id and d.settlement_date = s.settlement_date
         join instruments ins on ins.id = s.instrument_id
         join data_providers p on p.id = s.provider_id
        where s.institution_id = $1
          and not exists (select 1 from settlement_snapshots n where n.supersedes_revision_id = s.revision_id)
        order by s.holding_quantity desc nulls last, ins.id limit $3`,
      [input.institutionId, input.settlementDate, input.limit],
    );
    return result.rows as readonly Record<string, unknown>[];
  }

  async settlementHistory(
    input: Parameters<InstitutionalReader['settlementHistory']>[0],
  ) {
    const result = await this.connection.pool.query(
      `select to_char(s.settlement_date, 'YYYY-MM-DD') as "settlementDate", s.institution_id as "institutionId",
              i.canonical_name as "institutionName", s.holding_quantity::text as "holdingQuantity",
              s.holding_ratio::text as "holdingRatio", s.change_quantity::text as "changeQuantity",
              s.change_ratio::text as "changeRatio", s.residency, s.available_at as "availableAt",
              s.coverage_ratio::text as "coverageRatio", s.provider_dataset as "providerDataset",
              s.provider_revision as "providerRevision", p.code as provider
         from settlement_snapshots s join instruments ins on ins.id = s.instrument_id
         join intelligence_institutions i on i.id = s.institution_id
         join data_providers p on p.id = s.provider_id
        where ins.symbol = $1 and s.settlement_date between $2 and $3
          and ($4::uuid is null or s.institution_id = $4::uuid)
          and not exists (select 1 from settlement_snapshots n where n.supersedes_revision_id = s.revision_id)
        order by s.settlement_date desc, s.institution_id limit $5`,
      [input.symbol, input.from, input.to, input.institutionId, input.limit],
    );
    return result.rows as readonly Record<string, unknown>[];
  }

  async capability(
    capability:
      | 'institutional.akd'
      | 'settlement.snapshot'
      | 'settlement.foreign',
  ) {
    const result = await this.connection.pool.query(
      `select availability, health, checked_at as "checkedAt"
         from intelligence_provider_capabilities
        where capability = $1 order by checked_at desc limit 1`,
      [capability],
    );
    return (
      (result.rows[0] as
        | { availability: string; health: string; checkedAt: Date }
        | undefined) ?? {
        availability: 'PROVIDER_REQUIRED',
        health: 'UNAVAILABLE',
        checkedAt: null,
      }
    );
  }
}

function escapeLike(value: string) {
  return value.replaceAll(/[\\%_]/gu, (character) => `\\${character}`);
}
