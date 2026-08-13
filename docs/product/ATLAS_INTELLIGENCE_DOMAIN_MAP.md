# Atlas Intelligence Domain Map

**Status:** `APPROVED_FOR_TASK_110C`

## Canonical domains

| Canonical domain           | Owns                                                             | Reused by                                     |
| -------------------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| `MarketDataDomain`         | instruments, quotes, OHLCV, market summaries                     | Markets, charts, scanners, portfolio          |
| `DisclosureDomain`         | KAP source documents, issuer links, classifications, revisions   | KAP views, search, inbox, timeline            |
| `EventDomain`              | normalized corporate, financial, economic and contract events    | calendars, scanners, Impact Lab, alerts       |
| `CorporateActionDomain`    | dividends, buybacks, capital actions, IPO lifecycle              | portfolio adjustment, timeline, calendars     |
| `InstitutionalFlowDomain`  | AKD/broker distribution, buyer/seller and institution flows      | flow analytics, scanner, symbol/company views |
| `SettlementDomain`         | takas snapshots, foreign/institutional settlement, trends        | analytics, anomaly engine, scanner            |
| `MarketMeasureDomain`      | VBTS and symbol-level restrictions with effective intervals      | markets, symbol detail, alerts, scanner       |
| `FundamentalsDomain`       | statements, ratios, estimates and period alignment               | company, peer/compare, fundamental scanner    |
| `OwnershipDomain`          | fund positions and institutional ownership observations          | company, fund analytics, compare              |
| `FundDomain`               | fund identity, holdings, performance and risk measures           | fund analytics, compare, search               |
| `DerivativesDomain`        | VIOP contracts, basis, OI, volume, rollover and participant flow | VIOP hub, charts, scanners, calendars         |
| `OrderBookDomain`          | licensed depth snapshots and derived liquidity measures          | depth analytics, charts, anomaly engine       |
| `ResearchDefinitionDomain` | saved scans, comparisons, chart workspaces, experiments          | Radar, Research, cross-module navigation      |
| `PortfolioDomain`          | accounts, transactions, positions, performance and risk          | Portfolio, Home, company context              |
| `AlertDomain`              | alert definitions, evaluations, delivery policy and state        | Smart Inbox and all contextual alert actions  |
| `NotificationDomain`       | deduplicated inbox items, read state and delivery references     | Smart Inbox, Home badges, push routing        |
| `MethodologyDomain`        | versioned formulas, thresholds, cohorts and disclosures          | Pulse, regimes, anomalies, Impact Lab         |
| `ProviderCapabilityDomain` | provider, license, delay, entitlement and availability           | every provider-backed read path               |

## Consolidation invariants

- AKD analytics and AKD scanner are projections over `InstitutionalFlowDomain`; neither owns a
  second ingestion path or truth table.
- Takas analytics, settlement scanners and anomalies share `SettlementDomain` observations.
- KAP search, Company Timeline and event alerts preserve the same `DisclosureDomain` source ID and
  derive normalized records through `EventDomain`.
- Corporate events and calendars are views over `EventDomain`, not duplicated event stores.
- Fundamental scanner, company ratios and comparisons use period-aligned `FundamentalsDomain` data.
- VIOP analytics, scanners and chart overlays use `DerivativesDomain` contract identifiers.
- Contextual alerts create `AlertDomain` definitions and deliver through `NotificationDomain`.
- Company, fund and multi-symbol comparisons store definitions in `ResearchDefinitionDomain` and
  reference canonical observations; they do not copy provider data.

## Cross-domain identity and provenance

All observations require canonical instrument/issuer/institution/fund/contract IDs, provider source
ID, source timestamp, observed timestamp, ingestion timestamp, effective interval, revision/version,
quality state and capability decision. Derived outputs additionally require methodology version and
input lineage. Corrections are append-only or versioned; historical research remains reproducible.

## Ownership boundaries

Ingestion adapters translate provider payloads but do not own product semantics. Canonical domains
own validation and normalized terminology. Application read models compose domains for a surface.
Scanners consume domain query contracts. The intelligence layer consumes explainable domain facts
and cannot bypass provider capability, entitlement, lineage or freshness policy.

TASK-110C must turn this logical map into contracts, identifiers, storage/read-model boundaries,
retention rules, correction behavior and migration sequencing without creating duplicate domains.
