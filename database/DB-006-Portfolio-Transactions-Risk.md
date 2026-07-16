# DB-006 — Portfolio, Transactions and Risk Persistence

**Sürüm:** 1.0  
**Durum:** Uygulamaya hazır

## Tablolar

- `portfolios`
- `portfolio_transactions`
- `portfolio_positions`
- `portfolio_cash_balances`
- `portfolio_valuation_snapshots`
- `portfolio_position_snapshots`
- `portfolio_performance_snapshots`
- `portfolio_risk_snapshots`
- `portfolio_risk_exposures`
- `portfolio_import_jobs`
- `portfolio_import_rows`

## Kritik alanlar

`portfolios`: user, reporting currency, benchmark, status, ledger version, soft delete.

`portfolio_transactions`: type, status, trade/settlement time, quantity, price, fee, tax, cash amount, source, idempotency hash, normalized hash, reversal relation ve note.

`portfolio_positions`: quantity, average cost, cost basis, realized P&L, dividend income ve projection ledger version.

Snapshot tabloları ledger version, policy version, valuation range/cutoff ve warning bilgisi taşır.

## Constraints

- Para ve miktarda float yok.
- `portfolio_id + source + idempotency_key_hash` unique.
- Position `portfolio_id + instrument_id` unique.
- Snapshot version/cutoff unique.
- Ownership ve tarih sorguları için indeksler.
