# TASK-058 — Market Intelligence Caching and Quality Runtime

**Bağımlılık:** TASK-054–TASK-057

Amaç:

- snapshot reconciliation
- cache keys/invalidation
- stale/partial propagation
- generation consistency
- provider/restatement revision refresh
- pattern/indicator version invalidation
- quality metrics/admin-safe diagnostics
- performance regression commands

Zorunlu testler:

- new bar invalidation
- corporate action revision
- financial restatement
- indicator/pattern version change
- Redis loss fallback
- duplicate job delivery
- bounded query count
- cache poisoning/context mismatch

Admin olmayan kullanıcıya internal provider payload gösterme.
