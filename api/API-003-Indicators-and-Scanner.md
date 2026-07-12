# API-003 — Indicators and Scanner API

**Sürüm:** 1.0  
**Base:** `/api/v1`

## Indicator catalog

### `GET /indicators`

Filtreler:

- category
- status
- search

Her kayıt code, version, name, category, parameter metadata ve output metadata döner.

### `GET /indicators/{code}`

Desteklenen sürümleri ve default sürümü dönebilir.

## Operator catalog

### `GET /scanner/operators`

UI operand uyumluluğu ve display metadata alır.

## Validate

### `POST /scanner/validate`

Döner:

- valid
- normalizedRule
- validation errors
- complexity
- execution mode
- timeframes
- unique indicator count
- warm-up requirement
- warnings.

## Run

### `POST /scanner/runs`

`Idempotency-Key` destekler. Her çağrı run resource üretir.

## Status

### `GET /scanner/runs/{runId}`

- status
- progress
- dataCutoffAt
- queued/started/completed timestamps
- error code, varsa.

## Results

### `GET /scanner/runs/{runId}/results`

Cursor pagination ve izin verilen sort alanlarını destekler.

## Cancel

### `POST /scanner/runs/{runId}/cancel`

Yalnızca sahibi veya yetkili admin iptal edebilir. Terminal run iptal edilemez.

## Saved scans

- GET `/saved-scans`
- POST `/saved-scans`
- GET `/saved-scans/{id}`
- PATCH `/saved-scans/{id}`
- POST `/saved-scans/{id}/clone`
- DELETE `/saved-scans/{id}`
- GET `/saved-scans/{id}/revisions`

Update yeni revision oluşturur.

## Preset scans

- GET `/preset-scan-categories`
- GET `/preset-scans`
- GET `/preset-scans/{code}`
- POST `/preset-scans/{code}/runs`

## Hata kodları

- SCAN_RULE_INVALID
- SCAN_TOO_COMPLEX
- SCAN_LIMIT_REACHED
- SCAN_RUN_NOT_FOUND
- SCAN_RUN_ACCESS_DENIED
- SCAN_RUN_NOT_CANCELLABLE
- INDICATOR_NOT_FOUND
- OPERATOR_NOT_SUPPORTED
- OPERAND_TYPES_INCOMPATIBLE
