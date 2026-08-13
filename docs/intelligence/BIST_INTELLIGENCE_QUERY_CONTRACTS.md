# BIST Intelligence Query Contracts

All intelligence list queries use cursor pagination, deterministic sorting, bounded date ranges, bounded page size and filter allowlists. Default page size is 50, maximum 200; the shared default range ceiling is 366 days unless a capability publishes a stricter policy.

Common metadata may include `asOf`, `dataCutoff`, provider/source, live/delayed mode, freshness, coverage, quality, methodology version, license restrictions and capability availability. Raw provider payloads are forbidden.

Safe public errors include provider/license required, capability/provider unavailable, delayed/stale data, partial coverage, unresolved identity, source conflict, excessive range and not evaluable. Internal vendor errors remain redacted. No client-selected arbitrary provider is accepted.
