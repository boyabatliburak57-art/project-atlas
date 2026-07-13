# TASK-021 — Indicator and Scanner Core Milestone Audit

**Bağımlılık:** TASK-012–TASK-020

## Amaç

Indicator Engine ve Scanner domain çekirdeğinin kabul kriterlerini doğrulamak.

## Kontroller

Indicator contracts, input validation, parameter hash, math primitives, Set A/B fixture testleri, NaN/Infinity guard, registry deduplication, catalog API, AST safety, node/depth limits, cross semantics, üç durumlu truth tables, planner determinism, complexity/entitlement ve tüm quality/security gates.

## Çıktı

`reports/indicator-scanner-core-milestone-audit.md`

## GO

Failed 0, critical deviation 0, fixture ve scanner safety eksiksiz, foundation re-audit GO.

## T3 Code prompt

```text
TASK-021 görevini uygula. TASK-012–TASK-020 kabul kriterlerini gerçek kod ve komutlarla doğrula. Raporu oluştur. Eksikleri gizleme veya test skip etme. NO-GO ise TASK-022'ye geçme.
```
