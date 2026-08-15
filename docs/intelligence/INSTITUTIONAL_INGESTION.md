# Institutional Ingestion

Two capability-specific jobs are registered: `INSTITUTIONAL_FLOW_SYNC` and `SETTLEMENT_SYNC`. Each runs FETCH → VALIDATE → NORMALIZE → RESOLVE INSTRUMENT → RESOLVE INSTITUTION → DEDUP → PERSIST REVISION → CHECKPOINT.

Jobs accept bounded date windows (maximum 31 days), are retry-safe, idempotent, rate-limit aware, checkpointable, revision-aware, and production fail-closed. Backfills use trade-date windows for flow and settlement-date windows for Takas. Test adapters are dependency-injected only in tests; an absent production adapter returns provider-required instead of fixtures.
