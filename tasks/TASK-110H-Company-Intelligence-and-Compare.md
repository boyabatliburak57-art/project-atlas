# TASK-110H — Company Intelligence & Compare

**Durum:** BLOCKED_BY_TASK-110G
**Bağımlılıklar:** TASK-110G = `GO_FOR_TASK_110H`

## Amaç

Company Timeline, peer analysis, company comparison and analyst expectations surfaces oluşturmak;
ownership links prepared by TASK-110J ile compose edilebilir contract tanımlamak.

## Gereksinimler

Period/currency/unit alignment, restatements, peer-cohort methodology, estimate source/revision,
missing-data semantics and cross-domain lineage are mandatory. Comparison definitions reference
canonical facts rather than copying them.

## Test ve kabul

Test mismatched fiscal periods, restatements, sparse peers, estimate revisions, unavailable license
and deep-link context. Core company intelligence passes; result is `GO_FOR_TASK_110I`.
