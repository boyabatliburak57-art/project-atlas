# TASK-110F1 Market Structure API Result

Result: PASS

Added typed controller/service/repository contracts:

- `GET /api/v1/market-structure/instruments/:symbol/active`
- `GET /api/v1/market-structure/instruments/:symbol/history`
- `GET /api/v1/market-structure/measures`
- `GET /api/v1/market-structure/instruments/:symbol/short-selling`
- `GET /api/v1/symbols/:symbol/market-structure`

All queries use bound parameters, allowlisted taxonomy/status values, deterministic ordering, opaque signed cursors, page sizes up to 100, and historical ranges up to 366 days. Market-wide projection avoids per-symbol fan-out. Standard reads select latest visible revisions and enforce display license classes. Internal provider selection and raw payload delivery are absent.

Focused API tests: 14/14 PASS. OpenAPI validation: 1/1 PASS. Existing breaking API changes: 0. Undocumented endpoints: 0.
