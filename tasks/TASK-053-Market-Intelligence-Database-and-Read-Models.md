# TASK-053 — Market Intelligence Database and Read Models

**Bağımlılık:** TASK-052

DB-007'ye göre migration ve read model çekirdeğini oluştur:

- market overview snapshots
- sector snapshots
- ranking snapshots
- fundamental statement/metric/ratio snapshots
- pattern definitions/instances

Ek olarak:

- snapshot generation service
- idempotent upsert
- new closed bar invalidation/rebuild
- quality/partial status
- integration tests

Henüz HTTP endpoint, gerçek fundamentals provider veya pattern algorithms ekleme.

Kabul:

- clean migration
- unique/index constraints
- duplicate snapshot/pattern yok
- generation consistency
- revision preservation
- numeric fields
- format/lint/typecheck/build PASS
