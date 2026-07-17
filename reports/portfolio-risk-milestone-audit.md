# NO-GO — Portfolio, Transactions and Risk Analytics Milestone Audit

- **Görev:** TASK-050
- **Kapsam:** TASK-043–TASK-049
- **Audit tarihi:** 2026-07-16
- **Audit commit SHA:** `2055727399ad13326e34fcf9c44172ab1592a910`
- **Ortam:** macOS 25.5.0 arm64, Apple M1, 8 GiB RAM, Node.js 22.14.0, pnpm 9.15.4,
  PostgreSQL 17.10, Redis 7.4.9
- **Karar:** **NO-GO**

```text
Failed gates: 2
Critical deviations: 2
Financial fixture failures: 0
Risk fixture failures: 0
IDOR failures: 0
CSV security failures: 0
NaN/Infinity failures: 0
Mandatory portfolio performance failures: 1
Scanner Runtime regressions: 0
Alerts/Watchlists regressions: 1
E2E failures: 0
```

## Kararı engelleyen bulgular

| ID    | Kritiklik | Bulgu                                                                                                                                                                                                                                   | Kanıt                                                                                                                                                                         |
| ----- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-001 | Critical  | `GET /api/v1/portfolios/{id}/positions` gerçek application yolu `limit`/`cursor` kabul etmiyor ve tüm projection'ı döndürüyor. PERF-PORT-006 adapter sorgusu 500 ms eşiğini geçse de zorunlu application cursor invariant'ı sağlanmadı. | `PortfoliosService.positions()` → `readModel.projection()`; `pnpm perf:portfolio` non-zero; PERF-PORT-006 **FAIL**, p95 33,27 ms, uygulama-yolu invariant'ı false.            |
| F-002 | Critical  | Alerts/Watchlists GO baseline performance regresyonu: watchlist market summary sabit p95 ≤ 750 ms eşiğini iki kontrollü koşumda da aştı.                                                                                                | İlk koşum p95 975,93 ms; kontrollü tekrar p95 1.193,12 ms. `pnpm perf:alerts` iki kez non-zero; güncel `reports/performance/alerts-watchlists-baseline.json` durumu **FAIL**. |

Eşikler değiştirilmedi. Test skip/only eklenmedi. F-001 için sayısal adapter sonucu application
yolu yerine geçirilmedi; benchmark komutu invariant ihlalinde non-zero dönecek şekilde kapatıldı.

## 1. Toolchain ve repository kapıları

| Kapı                         | Komut / yöntem                                                     | Sonuç                                                          |
| ---------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------- |
| Node/pnpm                    | `pnpm version:check`                                               | PASS — Node 22.14.0, pnpm 9.15.4                               |
| Formatter                    | `pnpm format:check`                                                | PASS                                                           |
| ADR                          | `pnpm validate:adr`; validator self-test                           | PASS — 11 ADR; validator 3/3                                   |
| Lint, cache dışı             | `pnpm exec turbo run lint --force`                                 | PASS — 8/8 package, `Cached: 0`                                |
| Typecheck, cache dışı        | `pnpm exec turbo run typecheck --force`                            | PASS — 8/8 package, `Cached: 0`                                |
| Production build, cache dışı | `NEXT_PUBLIC_API_URL=... pnpm exec turbo run build --force`        | PASS — 8/8 package, `Cached: 0`; 10 web route                  |
| Secret synthetic             | `pnpm secret:scan:test`                                            | PASS                                                           |
| Secret repository/history    | `pnpm secret:scan`                                                 | PASS — 139 commit, 0 leak                                      |
| Dependency audit             | `pnpm audit --prod --audit-level high`; npm bulk advisory fallback | PASS — 208 production package adı, 0 advisory, 0 high/critical |
| Skip/only scan               | `rg` ile `skip`, `only`, `xit`, `xtest`, `xdescribe`               | PASS — 0 marker                                                |
| Whitespace                   | `git diff --check`                                                 | PASS                                                           |
| OpenAPI                      | `pnpm --filter @atlas/api openapi:check`                           | PASS — 1/1                                                     |
| Migration schema             | `pnpm --filter @atlas/database db:check`                           | PASS                                                           |
| Unit/runtime, cache dışı     | `pnpm exec turbo run test --force`                                 | PASS — 341/341                                                 |

Sabit pnpm 9.15.4 istemcisinin emekliye ayrılan npm audit endpoint'i HTTP 410 döndürdü. Önceki
iki GO baseline'ında kullanılan salt-okunur npm bulk advisory yöntemi, boş graph'ı reddeden guard
ile tekrarlandı. Bu araç sapması non-critical'dır; dependency güvenlik kapısı doğrulanmıştır.

## 2. Database kapıları

Temiz PostgreSQL compose instance'ında migration CLI ve integration testleri çalıştırıldı.

| Kontrol                        | Kanıt                                                                                              | Sonuç |
| ------------------------------ | -------------------------------------------------------------------------------------------------- | ----- |
| Clean migration                | `DATABASE_URL=... pnpm --filter @atlas/database db:migrate`; clean schema integration              | PASS  |
| Foreign key'ler                | Portfolio/instrument, reversal same-portfolio, snapshot child, import owner FK ihlal testleri      | PASS  |
| Numeric/decimal                | `numeric(28,10)` para/miktar, `numeric(20,12)` oran; real/double yok; NaN/overflow/negative guard  | PASS  |
| Transaction idempotency unique | `(portfolio_id, source, idempotency_key_hash)` unique ve race/application testleri                 | PASS  |
| Reversal relation              | Same-portfolio composite FK, tek reversal unique, self-reversal guard                              | PASS  |
| Position unique                | `(portfolio_id, instrument_id)` unique                                                             | PASS  |
| Snapshot version keys          | Ledger, valuation series, price/performance/risk methodology policy sürümleri identity key'lerinde | PASS  |
| Import ownership               | Job `(id, portfolio_id, user_id)` ve row job-owner composite FK                                    | PASS  |
| Timestamptz                    | Bütün portfolio zaman kolonları PostgreSQL `timestamp with time zone`                              | PASS  |
| Rollback/forward               | Belgeli destructive rollback gerçek DB'de çalıştırılıp forward migration yeniden uygulandı         | PASS  |

Gerçek database integration sonucu **23/23 PASS**. Portfolio atomic import database paketi ayrıca
repository'nin `vitest.database.config.ts` yapılandırmasına eklenen paket scripti üzerinden **4/4 PASS** oldu. Migration ilk denemesinde CLI'ya
yalnız `TEST_DATABASE_URL` verilmesi nedeniyle environment hatası alınmış; doğru `DATABASE_URL`
ile temiz instance üzerinde yeniden çalıştırılıp PASS elde edilmiştir. İlk environment hatası ürün
veya migration failure değildir.

## 3. Ledger finansal fixture kapıları

`packages/domain/src/portfolio/portfolio-ledger.test.ts` **25/25 PASS** ve gerçek PostgreSQL ledger
integration **3/3 PASS**.

| Fixture alanı                                                   | Sonuç |
| --------------------------------------------------------------- | ----- |
| Tek alış; iki alış weighted average; buy fee cost allocation    | PASS  |
| Partial sell; full sell; insufficient quantity/no short selling | PASS  |
| Sell commission/tax; realized ve unrealized P&L                 | PASS  |
| Dividend; cash deposit/withdrawal; standalone fee/tax           | PASS  |
| Posted immutability; reversal; ikinci reversal reddi            | PASS  |
| Idempotency replay; same key/different payload conflict         | PASS  |
| Projection rebuild determinism; past-dated rebuild              | PASS  |
| Small ve large decimal precision; zero position                 | PASS  |
| Public sonuçlarda NaN/Infinity guard                            | PASS  |

**Financial fixture failures: 0.**

## 4. Corporate action kapıları

Corporate action, valuation ve performance fixture dosyası **25/25 PASS**.

| Kontrol                                             | Sonuç |
| --------------------------------------------------- | ----- |
| 2:1 split ve unchanged total cost                   | PASS  |
| Bonus share ve artificial P&L oluşmaması            | PASS  |
| Rights issue yeni quantity/payment etkisi           | PASS  |
| Dividend cash ve total-return etkisi                | PASS  |
| Provider/manual duplicate corporate action koruması | PASS  |
| Fractional quantity `numeric(28,10)` policy         | PASS  |
| Corporate action sonrası deterministic rebuild      | PASS  |

## 5. Valuation ve performance kapıları

| Kontrol                                                       | Sonuç |
| ------------------------------------------------------------- | ----- |
| Tek mantıksal `dataCutoffAt`; future observation reddi        | PASS  |
| Missing price sıfır değil; partial/notEvaluable ve warning    | PASS  |
| Stale fiyat warning ile değer korunumu                        | PASS  |
| Ledger-version cache/snapshot invalidation                    | PASS  |
| TWR cash-flow'suz ve çoklu flow; geometrik linking            | PASS  |
| Same-day cash flow `beginningOfDay` policy                    | PASS  |
| XIRR convergence; no-solution/notEvaluable; sign-change guard | PASS  |
| Benchmark exact-date alignment ve missing warning             | PASS  |
| Price return/total return ve dividend ayrımı                  | PASS  |
| `closed-daily-v1`, `twr-xirr-v1` methodology sürümleri        | PASS  |

## 6. Risk kapıları

`packages/domain/src/portfolio/risk.test.ts` **25/25 PASS**, risk persistence integration **2/2
PASS**.

| Kontrol                                                          | Sonuç |
| ---------------------------------------------------------------- | ----- |
| Annualized volatility (252); beta; zero benchmark variance       | PASS  |
| Correlation; maximum/current drawdown; peak/trough/recovery      | PASS  |
| Historical VaR 95/99 lower-tail nearest-rank                     | PASS  |
| Expected Shortfall 95                                            | PASS  |
| HHI; symbol/top-3/top-5; sector; cash; unknown-sector exposure   | PASS  |
| Observation count ve metric-level status/reason                  | PASS  |
| Insufficient history; exact-date missing input; stale input      | PASS  |
| NaN/Infinity public guard                                        | PASS  |
| Cache invalidation, deterministic output ve `historical-risk-v1` | PASS  |

**Risk fixture failures: 0. NaN/Infinity failures: 0.**

## 7. API ve güvenlik kapıları

Portfolio API **15/15 PASS**, import/export API **9/9 PASS**, OpenAPI **1/1 PASS**.

| Kontrol                                                 | Sonuç |
| ------------------------------------------------------- | ----- |
| Portfolio IDOR                                          | PASS  |
| Transaction IDOR, portfolio IDOR'dan bağımsız           | PASS  |
| Import job IDOR ve export IDOR                          | PASS  |
| Posted transaction PATCH endpoint yok                   | PASS  |
| Ayrı reverse command endpoint                           | PASS  |
| Create/post/reverse/recalculate idempotency             | PASS  |
| Recalculate rate limit                                  | PASS  |
| Decimal string contract                                 | PASS  |
| Partial/stale valuation warning                         | PASS  |
| Risk metric status/reason/observation/methodology       | PASS  |
| Stable error code ve production stack trace suppression | PASS  |
| OpenAPI endpoint ve schema doğrulaması                  | PASS  |

**IDOR failures: 0.** F-001 nedeniyle positions endpoint'inin cursor pagination sözleşmesi eksik;
bu eksik IDOR yaratmıyor fakat performance/application-path kapısını düşürüyor.

## 8. CSV kapıları

CSV domain **12/12 PASS**, API **9/9 PASS**, gerçek PostgreSQL atomicity **4/4 PASS**.

| Kontrol                                                       | Sonuç |
| ------------------------------------------------------------- | ----- |
| Valid UTF-8 preview ve atomic commit                          | PASS  |
| Partial mode yalnız explicit seçimle                          | PASS  |
| Invalid row/ledger failure atomic rollback                    | PASS  |
| Duplicate row, file hash, external reference ve commit replay | PASS  |
| Unknown symbol, invalid date/decimal                          | PASS  |
| Import ve export formula injection escaping                   | PASS  |
| UTF-8, semicolon delimiter, quoted Türkçe note                | PASS  |
| 10.000 row ve 5 MiB file limit; overlong note/reference       | PASS  |
| Import/export ownership                                       | PASS  |

**CSV security failures: 0.** Preview doğrudan ledger tablolarına yazmıyor; atomic failure sonrası
transaction/projection/job state değişmiyor.

## 9. Web ve E2E kapıları

`pnpm --filter @atlas/web test:e2e --workers=1`: **8/8 PASS**. Yeni portfolio akışları 3/3,
Alerts/Notifications 2/2 ve Scanner 3/3 korunmuştur.

| Akış                                                                          | Sonuç |
| ----------------------------------------------------------------------------- | ----- |
| Portfolio create, cash deposit post, ilk/ikinci buy ve weighted average UI    | PASS  |
| Partial sell, realized/unrealized P&L ve reversal                             | PASS  |
| Performance, risk ve methodology/not-advice görünümü                          | PASS  |
| CSV valid preview/commit, invalid row, formula injection ve error report      | PASS  |
| Partial valuation warning ve foreign portfolio URL IDOR                       | PASS  |
| Keyboard focus, visible outline, semantic navigation/table/chart summary      | PASS  |
| Pending mutation ile duplicate submit koruması                                | PASS  |
| Empty/loading/error, backend error mapping, missing/stale/notEvaluable states | PASS  |

Accessibility veya E2E failure yoktur. Deterministik browser fixture'ları UI'ı gerçek tarayıcıda
çalıştırır; API/domain/ownership davranışları ayrı gerçek API ve PostgreSQL testleriyle
doğrulanmıştır.

## 10. Portfolio performance baseline

`pnpm perf:portfolio` gerçek test PostgreSQL ve Redis compose altyapısını, domain/application ve
PostgreSQL adapter yollarını, deterministik fixture'ları kullanır; dış provider/internet kullanmaz.
Eşik dosyası `performance/thresholds/portfolio-risk.json` içinde DOC-023 değerleriyle sabittir.
Runner JSON ve Markdown üretir ve invariant/threshold failure'da non-zero döner.

| ID            | Fixture                                                  | Warm/cold             | Tekrar | p50 ms | p95 ms | max ms | Hata | Threshold      | Sonuç |
| ------------- | -------------------------------------------------------- | --------------------- | -----: | -----: | -----: | -----: | ---: | -------------- | ----- |
| PERF-PORT-001 | 10.000 posted tx, 100 instrument, projection rebuild     | 1 cold hariç; 5 warm  |      5 | 336,62 | 393,42 | 393,42 |    0 | p95 ≤ 5.000 ms | PASS  |
| PERF-PORT-002 | 1.000 position/closed price, single cutoff, snapshot     | 1 cold hariç; 5 warm  |      5 | 387,56 | 783,47 | 783,47 |    0 | p95 ≤ 3.000 ms | PASS  |
| PERF-PORT-003 | 1.826 daily value, 3 irregular flow, TWR/XIRR            | 1 cold hariç; 20 warm |     20 |  68,65 | 101,56 | 105,64 |    0 | p95 ≤ 1.500 ms | PASS  |
| PERF-PORT-004 | 1.826 portfolio+benchmark, 1.000 exposure                | 1 cold hariç; 20 warm |     20 |   8,51 |   9,98 |  11,22 |    0 | p95 ≤ 3.000 ms | PASS  |
| PERF-PORT-005 | 10.000 mixed CSV row, duplicate/validation/error summary | 1 cold hariç; 5 warm  |      5 | 255,47 | 278,32 | 278,32 |    0 | p95 ≤ 8.000 ms | PASS  |
| PERF-PORT-006 | 1.000 owned position, page 50                            | 1 cold hariç; 5 warm  |      5 |  27,29 |  33,27 |  33,27 |    0 | p95 ≤ 500 ms   | FAIL  |

PERF-PORT-001 deterministik hash sayısı 1, projection duplicate satırı 0. PERF-PORT-002 snapshot
satırı 1.000, cutoff sayısı 1. PERF-PORT-003/004 NaN/Infinity sayısı 0. PERF-PORT-005 issue sayısı
104, preview öncesi/sonrası transaction sayısı 0/0 ve gözlenen heap delta 133.334.808 byte.

PERF-PORT-006'nın ham PostgreSQL cursor sorgusu 1.000 unique satırı eksik/duplicate olmadan 33,27
ms p95 ile getirdi. Ancak endpoint/application cursor yolu bulunmadığından zorunlu invariant FAIL ve
komut non-zero'dur. Bu sonuç yalnız sayısal threshold'a bakılarak PASS'e çevrilmemiştir.

## 11. Baseline regresyonu

### Scanner Runtime GO baseline

| Kapı                         | Baseline | Güncel audit | Sonuç |
| ---------------------------- | -------: | -----------: | ----- |
| Unit/runtime                 |      181 |          341 | PASS  |
| PostgreSQL/Redis integration |       24 |           51 | PASS  |
| Playwright                   |        3 |            8 | PASS  |
| AST round-trip               |     PASS |         PASS | PASS  |
| Performance                  |      6/6 |          6/6 | PASS  |

Scanner yeniden ölçümü: p95 değerleri sırasıyla 128,35; 3.695,85; 9.073,61; 2,58; 1,43 ve
1,20 ms. Bütün eşikler ve duplicate/progress/idempotency invariant'ları PASS. **Scanner Runtime
regression: 0.**

### Alerts/Watchlists GO baseline

| Kapı                         | Baseline | Güncel audit | Sonuç |
| ---------------------------- | -------: | -----------: | ----- |
| Unit/runtime                 |      223 |          341 | PASS  |
| PostgreSQL/Redis integration |       41 |           51 | PASS  |
| Playwright                   |        5 |            8 | PASS  |
| IDOR/XSS/duplicate delivery  |     PASS |         PASS | PASS  |
| Performance                  |      5/5 |          4/5 | FAIL  |

Güncel p95: candidate filtering 85,60 ms; evaluation batch 4.742,24 ms; unread 3,04 ms;
notification pagination 4,47 ms; watchlist market summary **1.193,12 ms**. Son senaryo 750 ms
eşiğini aştı. İlk koşumda da 975,93 ms ile aynı eşik başarısız oldu. **Alerts/Watchlists
regression: 1.**

Test sayısında gerekçesiz düşüş yoktur. Artışlar portfolio domain/API/web/database fixture'larıdır.

## Son karar

Milestone **NO-GO**. Finansal, risk, IDOR, CSV security, NaN/Infinity, format, ADR, secret,
dependency, build ve E2E kapıları temizdir; ancak GO koşullarındaki iki zorunlu madde sağlanmamıştır:

1. Positions pagination gerçek application/API cursor yolunda doğrulanamamış ve PERF-PORT-006
   invariant'ı FAIL olmuştur.
2. Alerts/Watchlists baseline'ındaki watchlist market summary performance eşiği iki koşumda da
   aşılmıştır.

Bu iki critical finding kapanmadan sonraki pakete geçilmesi önerilmez.
