# API-007 — Market Intelligence and Symbol Detail API

**Base:** `/api/v1`

## Market

- `GET /market/overview`
- `GET /market/breadth`
- `GET /market/sectors`
- `GET /market/rankings/{type}`

Ranking type allowlist kullanır.

## Symbol

- `GET /symbols/{symbol}`
- `GET /symbols/{symbol}/quote`
- `GET /symbols/{symbol}/chart`
- `GET /symbols/{symbol}/signals`
- `GET /symbols/{symbol}/corporate-actions`

### Chart query

- timeframe
- from/to
- limit
- adjustmentMode
- overlays
- includePatterns
- includeCorporateActions
- includeUserMarkers

## Fundamentals

- `GET /symbols/{symbol}/financials`
- `GET /symbols/{symbol}/ratios`
- `GET /symbols/{symbol}/financial-trends`

## Patterns

- `GET /patterns/catalog`
- `GET /symbols/{symbol}/patterns`
- `GET /market/patterns`

## Hata kodları

- `MARKET_SNAPSHOT_NOT_AVAILABLE`
- `MARKET_SNAPSHOT_PARTIAL`
- `SYMBOL_NOT_FOUND`
- `CHART_RANGE_INVALID`
- `CHART_OVERLAY_LIMIT_EXCEEDED`
- `CHART_ADJUSTMENT_UNAVAILABLE`
- `FUNDAMENTAL_DATA_NOT_AVAILABLE`
- `FUNDAMENTAL_PERIOD_INVALID`
- `PATTERN_NOT_FOUND`
- `PATTERN_VERSION_UNSUPPORTED`

## Güvenlik

- Public endpoint rate limit.
- User marker ownership.
- Query range/overlay limit.
- Provider raw payload yok.
- OpenAPI ve cursor contracts zorunlu.
