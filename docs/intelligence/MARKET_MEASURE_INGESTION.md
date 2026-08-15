# Market Measure Ingestion

`MARKET_MEASURE_SYNC` executes `FETCH → VALIDATE → NORMALIZE → RESOLVE_IDENTITY → DEDUP → PERSIST → NORMALIZE_EVENT → CHECKPOINT`.

Jobs are provider-scoped, cursor-checkpointed, limited to 31-day windows and 500 records per page. Their stable queue identity includes provider, dataset, date window, and cursor. At-least-once delivery is safe because database uniqueness uses provider/source identity/revision. Corrections create a new row and `supersedesRevisionId`; they never overwrite evidence.

The provider port is capability-specific. A missing adapter returns `MARKET_MEASURE_PROVIDER_REQUIRED`; short-selling activity additionally requires its explicit provider method. No fixture provider is registered by the default production composition. Backfills use the same bounded job contract and resume from source checkpoints.
