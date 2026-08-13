# BIST Intelligence Provider Contracts

Capabilities are dot-scoped and moderately granular: market price/OHLCV/depth; institutional AKD/money flow; settlement snapshot/foreign; disclosure KAP/financial result/corporate action; VBTS/short selling; calendar categories; fund metadata/performance/holdings; analyst consensus/target price; derivative contracts/open interest/basis/rollover/institutional flow.

Each provider implements only applicable ports: `DisclosureProvider`, `InstitutionalFlowProvider`, `SettlementProvider`, `MarketMeasureProvider`, `CalendarProvider`, `FundProvider`, `AnalystProvider`, `DerivativesProvider`, or `OrderBookProvider`. There is no intelligence god interface.

The common adapter envelope contains provider/capability, source reference/timestamp, fetch time, provider revision, live/delayed mode, license policy, schema version, correlation ID and provider DTO payload. The normalization boundary removes payload before public delivery.

Availability and operational health are separate. Freshness policy is capability-specific (`expectedRefreshCadence`, `staleAfter`, optional `hardExpireAfter`, `delayedBy`, session awareness). Jobs are bounded, idempotent, checkpointable, revision-aware, retry/rate-limit aware. Worker implementations begin in owning feature tasks; TASK-110C registers no fake worker.
