# BIST Intelligence Data Architecture

Status: TASK-110C canonical contract

## Principle and boundaries

Atlas applies **one domain model, many analytical surfaces**. Canonical owners are `InstrumentDomain`, `CompanyDomain`, `InstitutionDomain`, `CorporateDisclosureDomain`, `MarketEventDomain`, `InstitutionalFlowDomain`, `SettlementDomain`, `MarketMeasureDomain`, `CalendarDomain`, `FundDomain`, `FundHoldingDomain`, `AnalystConsensusDomain`, `DerivativesDomain`, `OrderBookDomain`, `DataProvenanceDomain` and `ProviderCapabilityDomain`.

AKD analysis/scanner/company views are projections over InstitutionalFlow. Takas views and anomaly inputs are Settlement projections. KAP is a source disclosure that can normalize into MarketEvent or the existing corporate-action model. Timeline, inbox, compare, scanner and findings do not own duplicate provider datasets.

## Pipeline

`Provider DTO → schema validation → normalization → canonical identity resolution → canonical entity/revision → persistence → bounded query projection`.

Provider DTOs and raw evidence are internal. Public APIs expose canonical fields plus common metadata, never raw payloads or credentials. Public market intelligence is not user-owned, though provider/license delivery authorization still applies. Watchlists, portfolios, scanners, strategies and alerts remain user-private and retain ownership guards.

## Storage classes

| Domain                                           | Class                               | TASK-110C strategy                                             |
| ------------------------------------------------ | ----------------------------------- | -------------------------------------------------------------- |
| Institution/company/fund/contract                | RELATIONAL_MASTER                   | PostgreSQL canonical master                                    |
| Disclosure/event/flow/settlement/measure/holding | IMMUTABLE_EVENT                     | PostgreSQL append-only revision foundation                     |
| Derivative statistics                            | TIME_SERIES                         | Existing PostgreSQL patterns until measured scale requires ADR |
| Order book                                       | HIGH_VOLUME_STREAM                  | Contract only; bounded Redis snapshot, no historical table     |
| Capability/freshness                             | RELATIONAL_MASTER + EPHEMERAL_CACHE | PostgreSQL policy, Redis optional health cache                 |
| Raw licensed evidence                            | OBJECT_EVIDENCE                     | Internal-only boundary, not implemented in TASK-110C           |

No mobile UI or live provider adapter is implemented in TASK-110C.
