# ADR-027 — Canonical BIST Intelligence Domain Model

Status: Accepted

## Decision

Atlas uses provider-neutral canonical domains and the rule **one domain model, many analytical surfaces**. AKD surfaces use `InstitutionalFlowDomain`; takas uses `SettlementDomain`; KAP source records use `CorporateDisclosureDomain` and normalize into `MarketEventDomain`/the existing corporate-action domain only after validation. Company Timeline is a point-in-time projection, not a duplicate store.

Stable relational masters and immutable revision records remain in PostgreSQL. Redis/BullMQ remain cache/job infrastructure. No new database technology is introduced.

## Consequences

Provider DTOs stop at the normalization boundary. Scanner, company, timeline, inbox, comparison and anomaly surfaces consume canonical queries. Missing values remain absent/null rather than zero.
