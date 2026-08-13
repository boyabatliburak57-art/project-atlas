# TASK-110F — BIST Market Structure & Restrictions

**Durum:** BLOCKED_BY_TASK-110E
**Bağımlılıklar:** TASK-110E = `GO_FOR_TASK_110F`

## Amaç

VBTS, gross settlement, single-price, order-package, short-selling restriction and short-selling
analytics'i effective-time aware bir market-measure domain ile sunmak.

## Gereksinimler

Measure source, legal wording, affected symbol, start/end time, revisions and current/historical
state must be preserved. Atlas explains observed measures and analytics but does not advise trades.

## Test ve kabul

Test overlapping measures, intraday changes, lifted/extended restrictions, corrections, stale
source and unavailable licensed analytics. Six capabilities pass; result is `GO_FOR_TASK_110G`.
