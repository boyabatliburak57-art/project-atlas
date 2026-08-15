# TASK-110E AKD Analytics Result

- Instrument distribution: bounded buyers, sellers, and all-institution queries.
- Market overview: two bounded aggregate queries; no per-symbol fan-out.
- Institution detail: bounded top bought/sold and history projection.
- Rolling windows: latest 1/5/20 distinct observed trading sessions, never calendar multiplication.
- Precision: PostgreSQL numeric and canonical Decimal; source/derived origins retained.
- Concentration: explainable top-1/top-3/top-5 shares only.
- Compare registry: net flow, institutional concentration, settlement concentration, foreign holding ratio.
- Radar foundation: existing `INSTITUTIONAL` and `SETTLEMENT` scanner extension families reused; no early scanner UI.

Representative PostgreSQL tests confirm five-session aggregation and canonical provenance. N+1: 0. Unbounded queries: 0.

Result: **PASS**.
