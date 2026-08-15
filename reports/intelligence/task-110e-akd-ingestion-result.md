# TASK-110E AKD Ingestion Result

`INSTITUTIONAL_FLOW_SYNC` is attached to the market-data BullMQ composition root. It executes FETCH, VALIDATE, NORMALIZE, identity resolution, deduplication, immutable revision persistence, and checkpoint completion. Jobs are bounded to 31 days, retry-safe, rate-limit compatible, idempotent, correction-aware, and fail closed when the adapter or configured connection is absent.

Unit worker contract: 8/8 PASS. Real Redis/BullMQ + PostgreSQL composition test: PASS. Duplicate replay inserted zero additional observations.

Result: **ATTACHED / PASS**.
