# BIST Intelligence Ingestion Model

Job types are disclosure, institutional flow, settlement, market measure, calendar, fund, analyst and derivatives sync. Each job is provider/capability scoped, date bounded, correlated and checkpointable.

Natural idempotency identities:

- KAP: provider + external disclosure ID + revision
- flow: provider + instrument + institution + trade date/session + revision
- settlement: provider + instrument + institution + settlement date + revision
- measure: provider + measure ID + revision
- calendar: provider source event ID + revision
- holding: provider + fund + instrument + reporting date + revision

Fixtures are separated by capability/schema version, development/test only, and must cover corrections, missing values, delay and unresolved identity. Production adapter initialization never falls back to fixtures or demo data.

Safe observability includes fetch duration/status, received/normalized/rejected records, identity failures, revisions, dedup hits, staleness, rate limit and license-blocked delivery. Resource IDs are prohibited as metric labels.
