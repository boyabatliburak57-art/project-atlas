# TASK-100G — Mobile Portfolio and Risk

**Durum:** BLOCKED_BY_TASK-100F  
**Bağımlılıklar:** TASK-100F

## Amaç

Portföy, işlem, performans ve risk kabiliyetlerini finansal doğruluğu koruyarak mobile taşımak.

## Mevcut durum

Immutable ledger, positions, valuation, performance, benchmark, corporate action ve risk API/domain
ile web ekranları vardır. Native forms/charts yoktur.

## Kapsam

Total/daily/unrealized/realized/cash ve yalnız tanımlı buying power; allocation/sector/positions/
transactions/benchmark; donut, performance, comparison, drawdown, risk trend; volatility, beta,
Sharpe, max drawdown, VaR, concentration, HHI; buy/sell/dividend/deposit/withdrawal/fee/tax/
corporate action forms; tr-TR decimal/TRY.

## Kapsam dışı

Order execution, undefined buying power, offline automatic ledger mutation, client-side valuation
truth.

## Bağımlılıklar

Portfolio/risk APIs, methodology decisions, financial formatting, chart components and provider
corporate-action capability.

## Mimari gereksinimler

Ledger/server calculations authoritative. Mobile maps typed values and methodology/version/cutoff.
Mutation idempotency key and explicit confirmation protect retries.

## API gereksinimleri

Owner-scoped portfolio/position/transaction/risk endpoints, opaque cursors, decimal strings,
currency and methodology metadata. Any missing mobile summary is added as read model, not client
recalculation.

## UI/UX gereksinimleri

P&L sign/text/color, stale/partial warnings, methodology sheet, keyboard-aware decimal inputs and
transaction-specific validation. Buying power hidden unless contract defines it.

## Güvenlik gereksinimleri

Portfolio/position/transaction/report IDOR, replay/double-submit, decimal overflow, export/share
redaction, screenshot/app-switcher policy and sanitized errors.

## Accessibility gereksinimleri

Chart summaries/data alternatives, readable large currency values, logical form focus, error
announcement, non-color allocations and tablet keyboard.

## Unit testleri

tr-TR parsing/formatting, sign/currency, transaction schemas, chart mappings, stale/partial logic,
idempotency.

## Integration testleri

Overview/positions/cursors/transactions/performance/risk/corporate actions and owner isolation.

## Mobile E2E testleri

Portfolio overview, position detail, every supported transaction type, validation/cancel/retry,
risk/methodology, offline mutation rejection.

## Visual regression testleri

Portfolio/risk/transaction screens and all states light/dark across device classes.

## Kabul kriterleri

Server-vs-mobile financial fixture mismatch 0; portfolio IDOR 0; duplicate mutation 0; TRY policy
tutarlı; chart summary coverage 100%; unsupported values not displayed.

## Yasak yöntemler

Float-based money arithmetic; client-side P&L truth; optimistic ledger mutation offline; fabricated
buying power; color-only loss; investment recommendation.

## Çıktı raporu

`reports/mobile/task-100g-portfolio-risk.md`, reconciliation fixtures, IDOR and screenshots.

## Ayrıntılı T3 Code uygulama prompt'u

```text
TASK-100G'yi uygula. Existing portfolio ledger/performance/risk APIs and accepted methodology
decisions remain authoritative. Mobile overview, positions, transactions and risk screens/charts
oluştur; tr-TR decimal and consistent TRY format kullan. Eksik summary'yi clientta hesaplama,
owner-scoped read model olarak API'de tasarla. Financial mutations idempotent, confirmed ve offline
fail-closed olsun. Tüm işlem türleri, risk metrics, stale/methodology, IDOR, duplicate submit,
unit/integration/E2E/visual/a11y ve reconciliation fixtures'i çalıştır.
```
