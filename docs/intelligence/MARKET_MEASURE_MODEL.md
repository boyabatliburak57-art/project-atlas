# Market Measure Model

`MarketMeasureDomain` owns `MarketMeasure` revisions. Its canonical identity is provider + source measure ID + provider revision. Each immutable revision has instrument identity, canonical type, source status, `publishedAt`, `availableAt`, `effectiveFrom`, optional `effectiveUntil`, source reference, structured attributes, provenance, quality, and license policy.

Canonical types are `SHORT_SELL_RESTRICTION`, `MARGIN_TRADING_RESTRICTION`, `GROSS_SETTLEMENT`, `SINGLE_PRICE`, `ORDER_PACKAGE_MEASURE`, and `OTHER_EXCHANGE_MEASURE`. Product status is resolved from the effective interval at server time; source lifecycle states `CORRECTED`, `SUPERSEDED`, and `CANCELLED` remain terminal evidence states.

Standard queries exclude superseded revisions visible at the requested point in time. Audit history preserves every revision. Active/history/recently-started/recently-ended lists are projections, not persistence tables.
