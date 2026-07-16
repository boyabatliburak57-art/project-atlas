# API-006 — Portfolios, Transactions and Risk API

**Base:** `/api/v1`

## Portföyler

- `GET/POST /portfolios`
- `GET/PATCH/DELETE /portfolios/{id}`
- `POST /portfolios/{id}/restore`

## İşlemler

- `GET/POST /portfolios/{id}/transactions`
- `GET /portfolios/{id}/transactions/{transactionId}`
- `POST /portfolios/{id}/transactions/{transactionId}/post`
- `POST /portfolios/{id}/transactions/{transactionId}/reverse`

Posted işlem doğrudan PATCH edilmez.

## Değerleme, performans ve risk

- `GET /portfolios/{id}/positions`
- `GET /portfolios/{id}/valuation`
- `GET /portfolios/{id}/valuation-history`
- `POST /portfolios/{id}/recalculate`
- `GET /portfolios/{id}/performance`
- `GET /portfolios/{id}/risk`

## Import/export

- `POST /portfolios/{id}/imports`
- `GET /portfolios/{id}/imports/{jobId}`
- `GET /portfolios/{id}/imports/{jobId}/rows`
- `POST /portfolios/{id}/imports/{jobId}/commit`
- `POST /portfolios/{id}/imports/{jobId}/cancel`
- export job endpointleri

## Güvenlik

Ownership/IDOR, Idempotency-Key, decimal string validation, CSV formula injection, dosya/satır limiti ve kısa ömürlü export erişimi zorunludur.
