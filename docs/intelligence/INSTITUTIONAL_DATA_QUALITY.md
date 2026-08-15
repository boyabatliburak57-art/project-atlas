# Institutional Data Quality

Validation rejects invalid dates, future `availableAt`, malformed decimals, impossible negative source quantities, out-of-range ratios, currency mismatch, unsafe identities, and inconsistent supplied/derived net values. It detects duplicates, corrections, stale/delayed delivery, partial coverage, missing sides, unresolved identities, and source conflicts.

Quality is carried with every revision. `PARTIAL` and `NOT_EVALUABLE` are not errors and never become zero. Analytics read the latest valid revision for current views while point-in-time research uses `availableAt` and preserves superseded records.
