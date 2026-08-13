# TASK-110O — Cross-Module Intelligence

**Durum:** BLOCKED_BY_TASK-110N
**Bağımlılıklar:** TASK-110N = `GO_FOR_TASK_110O`

## Amaç

Scanner → Backtest, Event → Historical Analysis, Advanced Company Compare and cross-module research
navigation'ı context-preserving workflows olarak tamamlamak.

## Gereksinimler

Handoffs create versioned research definitions, never implicit recommendations. Context envelopes
preserve object IDs, filters, time window, as-of, source/methodology version and access checks.
Unavailable downstream capability fails closed without losing the originating research state.

## Test ve kabul

Test round trips, history/back behavior, stale/revised sources, unauthorized resources, mixed
capabilities and deterministic reruns. Cross-module duplication is zero; result is
`GO_FOR_TASK_110P`.
