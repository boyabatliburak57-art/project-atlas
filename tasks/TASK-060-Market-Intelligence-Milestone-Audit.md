# TASK-060 — Market Intelligence Milestone Audit

**Bağımlılık:** TASK-053–TASK-059

Çıktı:

`reports/market-intelligence-milestone-audit.md`

Doğrula:

- migrations/read models
- generation consistency
- breadth denominator/excluded
- rankings cursor invariants
- raw/adjusted chart separation
- overlay alignment/versioning
- corporate action markers
- fundamentals revision/TTM/ratios
- pattern no-look-ahead/dedup/evidence
- API/OpenAPI/rate limit/IDOR
- Web/Playwright/accessibility
- cache invalidation/Redis fallback
- format/ADR/lint/typecheck/test/build
- secret/dependency audit
- Scanner/Alerts/Portfolio baseline regressions

Performance:

- PERF-MKT-001–006

GO:

- Failed = 0
- Critical deviations = 0
- Cursor/chart invariant failures = 0
- Fundamental fixture failures = 0
- Pattern look-ahead failures = 0
- IDOR/security failures = 0
- Mandatory performance thresholds PASS
- Previous milestone regressions = 0

NO-GO ise sonraki pakete geçme.
