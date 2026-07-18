# TASK-068 — Backtest API, Analytics and Export

**Bağımlılık:** TASK-067

API-008'e göre oluştur:

- strategy CRUD/revision/clone/validate
- backtest create/list/status/cancel
- summary/methodology
- series
- trades/orders/fills
- trade cursor pagination
- experiments/results/matrix
- secure export
- OpenAPI
- ownership/IDOR
- rate/complexity limits

Kabul:

- idempotent run create
- same key different request conflict
- trade duplicate/missing yok
- cursor context-bound
- result/export ownership
- CSV formula injection
- methodology/data snapshot görünür
- OpenAPI PASS
