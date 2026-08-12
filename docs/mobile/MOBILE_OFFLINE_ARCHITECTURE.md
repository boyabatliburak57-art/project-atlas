# Mobile Offline Architecture

Mobile v1 uses read-only, bounded offline state. Server mutations use online network mode, are not retried as an offline queue, and fail with `OFFLINE_MUTATION_BLOCKED`. Reconnect may refresh safe queries; it never replays a mutation.

Private and financial responses use owner-scoped in-memory TanStack Query/cache keys. No AsyncStorage, SQLite, MMKV or persisted Query cache is used. `OwnerScopedMemoryCache` enforces TTL, LRU bounds, owner namespaces and `EXPIRED_OFFLINE_CACHE`. Logout/user switch clears all private query and security state. Public help/methodology persistence is permitted by policy but is not currently implemented.

Offline is distinct from `PROVIDER_REQUIRED`, `STALE`, `PARTIAL`, `UNAVAILABLE` and `NOT_EVALUABLE`. Cached screens expose cached-at, authoritative data-as-of, freshness and read-only state. Market and other internal data have five-minute policy TTLs; financial-sensitive data has a five-minute in-memory ceiling; public content may be retained for 30 days if a protected bounded cache is added.

`CACHE_SCHEMA_VERSION` rejects corrupt/incompatible envelopes with safe purge. Cleanup triggers are expiry, logout, account switch, resource deletion, schema mismatch, privacy reset and storage pressure. There is no financial mutation replay and no client background financial evaluation.
