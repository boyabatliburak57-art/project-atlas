# Positions Cursor Pagination Contract

## Endpoint

```text
GET /api/v1/portfolios/{portfolioId}/positions
```

## Query

- cursor
- limit
- sortField
- sortDirection
- izin verilen filtreler

## Response meta

- nextCursor
- limit
- projectionLedgerVersion
- dataCutoffAt
- requestId

## Desteklenen ilk sort alanları

- symbol
- marketValue
- weight
- unrealizedPnl
- dailyChange

Her biri stable unique tie-breaker kullanır.

## Hata kodları

- `PORTFOLIO_CURSOR_INVALID`
- `PORTFOLIO_CURSOR_CONTEXT_MISMATCH`
- `PORTFOLIO_CURSOR_VERSION_MISMATCH`
- `PORTFOLIO_PROJECTION_CHANGED`

## Zorunlu testler

1. İlk/orta/son sayfa
2. Empty ve exact boundary
3. Aynı sort value
4. ASC/DESC
5. Duplicate/missing row yok
6. Invalid cursor
7. Portfolio/user context mismatch
8. Filter/sort mismatch
9. Ledger version değişimi
10. Limit upper bound
11. Deleted portfolio
12. IDOR
13. Decimal serialization
14. OpenAPI
15. Gerçek HTTP round-trip
