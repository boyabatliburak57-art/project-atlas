# TASK-110F1 Market Measure Model Result

Decision: PASS

## Canonical model

- Owner: existing `MarketMeasureDomain`; duplicate market-structure domains: 0.
- Types: `SHORT_SELL_RESTRICTION`, `MARGIN_TRADING_RESTRICTION`, `GROSS_SETTLEMENT`, `SINGLE_PRICE`, `ORDER_PACKAGE_MEASURE`, `OTHER_EXCHANGE_MEASURE`.
- Temporal fields remain distinct: `publishedAt`, `availableAt`, `effectiveFrom`, `effectiveUntil`, `sourceTimestamp`, `ingestedAt`.
- Lifecycle supports scheduled, active, expired, corrected, superseded, and cancelled evidence.
- Latest-visible resolution uses `availableAt`, effective interval, and immutable supersession links. Client clocks do not decide active state.
- Provider taxonomy is preserved in structured attributes; unknown taxonomy maps safely to `OTHER_EXCHANGE_MEASURE`.

## Persistence

Tables before: 109. Tables added: 1. Tables after: 110.

`short_selling_activity_observations` was required because observed trading statistics are semantically different from restriction/effective-period records. It is revisioned and immutable. No active, expired, history, leaderboard, VBTS-list, restricted-symbol, or symbol-summary table was added; those remain bounded queries.

Indexes are justified by instrument/effective-period, type/effective-period, publication, availability, and instrument/trade-date access paths.
