# TASK-110I — Scanner / Radar 2.0

**Durum:** BLOCKED_BY_TASK-110H
**Bağımlılıklar:** TASK-110H = `GO_FOR_TASK_110I`

## Amaç

Existing scanner runtime'ı fundamental 2.0, institutional, settlement, event and anomaly screening
ile genişletmek ve Radar hub'a bağlamak.

## Gereksinimler

One versioned scanner AST/query model references canonical domains. Every field carries capability,
freshness and methodology metadata. Unsupported conditions fail validation or return an explicit
closed state; no fabricated result set.

## Test ve kabul

Test saved-scan revisions, mixed-capability queries, cursor determinism, historical as-of behavior,
license denial, performance and Scanner → Backtest handoff contract. Five scanners pass; result is
`GO_FOR_TASK_110J`.
