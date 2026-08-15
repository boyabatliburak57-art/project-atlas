# KAP Ingestion

The bounded BullMQ job executes FETCH, VALIDATE, NORMALIZE, RESOLVE_IDENTITIES, DEDUP, PERSIST_DISCLOSURE, NORMALIZE_EVENT, PERSIST_EVENT, and CHECKPOINT. Jobs are date-windowed (maximum 31 days), capped, retry-safe, checkpointable, and idempotent. Test fixtures exercise revisions, malformed payloads, delay, missing identity, and attachments. No production provider means a fail-closed `PROVIDER_REQUIRED` result, never fixture fallback.
