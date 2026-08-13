# TASK-110C Canonical Domain Matrix

| Domain                | Canonical entities             | Analytical consumers             | Persistence                    |
| --------------------- | ------------------------------ | -------------------------------- | ------------------------------ |
| Instrument            | existing Instrument            | all market domains               | existing relational master     |
| Company               | Company                        | timeline/compare/disclosure      | relational master              |
| Institution           | Institution + alias mapping    | AKD/takas/fund/analyst           | relational master              |
| CorporateDisclosure   | immutable DisclosureRevision   | KAP/event/action                 | immutable event                |
| MarketEvent           | normalized revision            | timeline/inbox/scanner/impact    | immutable event/projection     |
| InstitutionalFlow     | observation revision           | analysis/scanner/company/anomaly | immutable time observation     |
| Settlement            | snapshot revision              | takas/scanner/company/anomaly    | immutable snapshot             |
| MarketMeasure         | validity-bounded revision      | VBTS/restrictions                | immutable event                |
| Calendar              | typed event contract           | calendars/timeline               | immutable event future         |
| Fund/FundHolding      | fund master + holding revision | fund/company ownership/compare   | master + immutable revision    |
| AnalystConsensus      | estimate revision contract     | company/compare                  | implementation deferred        |
| Derivatives           | contract + statistic           | VIOP/calendar/compare            | master + time series future    |
| OrderBook             | streamed level                 | depth analytics                  | ephemeral/high-volume strategy |
| Provenance/Capability | metadata + policy              | every response/delivery          | shared contract/master         |

Duplicate intelligence domains: **0**.
