# Market Structure Data Quality

Validation rejects invalid effective intervals, unavailable-before-publication records, unsafe source references, unresolved instrument identity, duplicate revisions, empty activity observations, negative activity values, and invalid turnover ratios. Delayed delivery and provider-required states remain explicit.

Point-in-time reads use `availableAt`, not ingestion time or the client clock. Current reads use the latest visible valid revision. Conflicting or overlapping source semantics are retained as quality findings rather than silently reconciled. Raw provider payloads are internal-only and are absent from schema and public responses.

Indexes support instrument/effective-period, type/effective-period, publication, availability, and instrument/trade-date queries. The API allowlists filters, uses bound parameters, caps pages at 100, and caps history at 366 days.
