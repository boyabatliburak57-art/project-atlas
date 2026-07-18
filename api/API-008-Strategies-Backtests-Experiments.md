# API-008 — Strategies, Backtests and Experiments API

**Base:** `/api/v1`

## Strategies

- `GET/POST /strategies`
- `GET/PATCH/DELETE /strategies/{id}`
- `POST /strategies/{id}/restore`
- `POST /strategies/{id}/clone`
- `GET /strategies/{id}/revisions`
- `POST /strategies/validate`

Update yeni revision oluşturur.

## Backtests

- `POST /backtests`
- `GET /backtests`
- `GET /backtests/{id}`
- `POST /backtests/{id}/cancel`
- `GET /backtests/{id}/summary`
- `GET /backtests/{id}/series`
- `GET /backtests/{id}/trades`
- `GET /backtests/{id}/orders`
- `GET /backtests/{id}/fills`
- `GET /backtests/{id}/methodology`

Run create idempotency destekler.

## Progress

Polling zorunlu, SSE opsiyoneldir.

## Trades

Cursor pagination ve stable tie-breaker zorunludur.

## Experiments

- `GET/POST /experiments`
- `GET /experiments/{id}`
- `POST /experiments/{id}/cancel`
- `GET /experiments/{id}/results`
- `GET /experiments/{id}/matrix`
- `POST /experiments/{id}/export`

## Export

Summary, trades, orders/fills, equity series ve experiment matrix.

CSV formula injection ve rate limit uygulanır.

## Güvenlik

- strategy/run/experiment ownership
- cursor context binding
- export IDOR
- complexity limits
- no eval/free code
- internal provider payload yok
