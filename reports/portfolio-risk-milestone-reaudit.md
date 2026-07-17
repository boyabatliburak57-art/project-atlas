# GO — Portfolio, Transactions and Risk Analytics Milestone Re-audit

- **Görev:** TASK-050C
- **Kapsam:** TASK-050A ve TASK-050B remediation doğrulaması; TASK-043–TASK-049 regresyonu
- **Re-audit tarihi:** 2026-07-18
- **Audit commit SHA:** `2055727399ad13326e34fcf9c44172ab1592a910`
- **Ortam:** macOS 25.5.0 arm64, Apple M1, 8 GiB RAM, Node.js 22.14.0, pnpm 9.15.4,
  PostgreSQL 17.10, Redis 7.4.9
- **Karar:** **GO**

```text
Failed gates: 0
Critical deviations: 0
Financial fixture failures: 0
Risk fixture failures: 0
IDOR failures: 0
CSV security failures: 0
NaN/Infinity failures: 0
Mandatory performance failures: 0
Scanner Runtime regressions: 0
Alerts/Watchlists regressions: 0
E2E failures: 0
```

İlk TASK-050 audit'indeki iki kritik bulgu kapatılmıştır. F-001 için positions ölçümü artık adapter
süresini başarı saymayan gerçek HTTP/application yolunu kullanır. F-002 için watchlist market
summary ürün sözleşmesi korunarak keyset ve toplu enrichment sorgularıyla iyileştirilmiştir.

## 1. Positions gerçek HTTP/application/API cursor pagination yolu

`GET /api/v1/portfolios/{id}/positions` aşağıdaki gerçek yolu tamamlar:

```text
HTTP
→ authentication
→ portfolio ownership/deleted-state kontrolü
→ query validation
→ PortfoliosService application katmanı
→ versioned opaque cursor validation
→ PostgreSQL keyset query
→ position DTO + response meta mapping
→ JSON serialization ve HTTP response
```

Controller iş mantığı içermez. `limit`, `cursor`, `sortField`, `sortDirection` ve `symbol`
application katmanında doğrulanır. Repository sorgusu offset kullanmaz; seçilen sort değeri ve
`instrument_id` stable unique tie-breaker'ı ile keyset pagination uygular. Response meta,
`nextCursor`, `limit`, `sortField`, `sortDirection`, `projectionLedgerVersion` ve `dataCutoffAt`
alanlarını taşır.

Cursor version 1 opaque base64url payload'u kullanıcı, portfolio, sort alanı/yönü, normalize filtre,
son sort değeri, instrument tie-breaker ve `projectionLedgerVersion` bağlamlarına bağlıdır. Cursor
yalnız adapter'a verilmez; authentication, ownership, validation ve application kontrollerinden
geçtikten sonra repository keyset query'sine çevrilir.

## 2. Cursor invariant kanıtları

Portfolio API integration paketi **21/21 PASS**; positions kapsamındaki invariant sonuçları:

| Invariant                   | Kanıt                                                 | Sonuç |
| --------------------------- | ----------------------------------------------------- | ----- |
| Duplicate row               | 1.000 row tam traversal; unique 1.000, duplicate 0    | PASS  |
| Missing row                 | Beklenen 1.000, görülen 1.000, missing 0              | PASS  |
| İlk/orta/son sayfa          | 7-row fixture, limit 3 → 3/3/1                        | PASS  |
| Stable tie-breaker          | Eşit sort değerlerinde ASC ve DESC traversal          | PASS  |
| Başka portfolio cursor'ı    | `PORTFOLIO_CURSOR_CONTEXT_MISMATCH`                   | PASS  |
| Başka kullanıcı             | Ownership önce çalışır; `PORTFOLIO_ACCESS_DENIED`     | PASS  |
| Sort/filter mismatch        | `PORTFOLIO_CURSOR_CONTEXT_MISMATCH`                   | PASS  |
| Cursor schema/version       | Invalid cursor ve version mismatch standard 400 error | PASS  |
| Projection version değişimi | Eski cursor → `PORTFOLIO_PROJECTION_CHANGED` (409)    | PASS  |
| Query sınırı                | `limit > 100` validation error                        | PASS  |
| Deleted portfolio           | Position page reddedilir                              | PASS  |

PERF-PORT-006 raporunda `cursor invariant failures: 0` kaydedilmiştir. Duplicate/missing ve ledger
version kuralları uygulama testinde ve gerçek 1.000-row benchmark traversal'ında birlikte
doğrulanmıştır.

## 3. PERF-PORT-006 — gerçek API performance sonucu

| Fixture                 | Tekrar | Warm/cold                        |      p50 |      p95 |       Max | Hata | Threshold    | Sonuç |
| ----------------------- | -----: | -------------------------------- | -------: | -------: | --------: | ---: | ------------ | ----- |
| 1.000 position, page 50 |    100 | 1 cold warm-up hariç; warm ölçüm | 21,21 ms | 44,42 ms | 109,32 ms |    0 | p95 ≤ 500 ms | PASS  |

Tam 1.000-row traversal p50/p95/max değeri 466,11/716,95/716,95 ms'dir. Adapter-only traversal
152,53 ms olarak yalnız diagnostik amaçla kaydedilmiş ve gate sonucu olarak kullanılmamıştır.
Benchmark gerçek API process'i, PostgreSQL, Redis, authentication, ownership, application,
serialization ve HTTP response süresini içerir. Komut threshold veya invariant ihlalinde non-zero
exit üretir.

## 4. Watchlist market summary önceki ve sonraki performans

| Ölçüm                       | Yol                           |          p50 |         p95 |          Max | Query count | Sonuç |
| --------------------------- | ----------------------------- | -----------: | ----------: | -----------: | ----------: | ----- |
| TASK-040 GO baseline        | Historical adapter baseline   |    399,13 ms |   636,27 ms |    636,27 ms |           1 | PASS  |
| TASK-050 run 1              | Historical adapter regression | Kaydedilmedi |   975,93 ms | Kaydedilmedi |           1 | FAIL  |
| TASK-050 run 2              | Historical adapter regression | Kaydedilmedi | 1.193,12 ms | Kaydedilmedi |           1 | FAIL  |
| TASK-050B independent run 1 | Gerçek API                    |     49,62 ms |   127,02 ms |    127,02 ms |          10 | PASS  |
| TASK-050B independent run 2 | Gerçek API                    |     41,28 ms |    87,52 ms |     87,52 ms |          10 | PASS  |
| TASK-050C re-audit          | Gerçek API                    |     35,63 ms |    46,60 ms |     46,60 ms |          10 | PASS  |

Her gerçek API koşumu 5 ownership/item keyset query ve 5 page-bounded toplu enrichment query
kullanır. Instrument, market data ve active alert aggregation item başına sorgu üretmez. Cache
kapalıdır; hit/miss 0/0. Ownership kontrolü enrichment'tan önce çalışır. Active alert count,
stale/data-cutoff alanları ve response contract korunmuştur.

## 5. Fixture ve threshold koruma kanıtı

- PERF-PORT-006 fixture **1.000 position**, page size **50**, tekrar **100**, threshold **p95 ≤ 500
  ms** olarak korunmuştur.
- PERF-AWN-005 fixture **500 instrument**, instrument başına **2 closed bar**, **1.000 active
  alert**, 3 hariç tutulan warm-up ve 10 ölçülen traversal olarak korunmuştur.
- PERF-AWN-005 threshold **p95 ≤ 750 ms** olarak korunmuştur.
- Erişim kontrolü, market-data enrichment, active alert count, stale ve data-cutoff alanları
  kaldırılmamıştır.
- `performance/thresholds/portfolio-risk.json` kabul değerleri değiştirilmemiştir.
- Offset pagination, fixture küçültme, threshold gevşetme, cache prewarm, test skip/only veya gate
  bypass kullanılmamıştır.

## 6. Portfolio finansal ve risk fixture regresyonları

Tek süreçte, cache dışı paket testi **347/347 PASS**:

| Paket             |   Sonuç |
| ----------------- | ------: |
| `@atlas/domain`   | 231/231 |
| `@atlas/database` |   11/11 |
| `@atlas/api`      |   67/67 |
| `@atlas/worker`   |   30/30 |
| `@atlas/web`      |     8/8 |

Gerçek PostgreSQL/Redis integration assertions **55/55 PASS**: database 23/23, portfolio CSV
atomicity 4/4 ve worker 28/28. Paralel ilk koşumdaki iki test-hook timeout'u ve worker scanner
suite başlangıç timeout'u kontrollü tek-süreç/izole yeniden koşumlarda sırasıyla 347/347 ve 28/28
PASS olmuştur; assertion veya ürün davranışı failure'ı değildir.

| Kapı                                                                              | Sonuç |
| --------------------------------------------------------------------------------- | ----- |
| Moving weighted average, fees, partial/full sell, realized/unrealized P&L         | PASS  |
| Posted immutability, reversal, idempotency, deterministic/past-dated rebuild      | PASS  |
| Split, bonus, rights, dividend, duplicate corporate action, artificial P&L guard  | PASS  |
| Valuation cutoff, missing/partial, stale, cache invalidation, TWR/XIRR, benchmark | PASS  |
| Volatility, beta, correlation, drawdown, VaR 95/99, ES, HHI/concentration         | PASS  |
| Insufficient/missing/stale risk input ve methodology version                      | PASS  |
| Decimal precision ve public NaN/Infinity guard                                    | PASS  |

Financial fixture failures **0**, risk fixture failures **0**, NaN/Infinity failures **0**.

## 7. CSV, IDOR, API ve E2E regresyonları

| Alan                       | Kanıt                                                      | Sonuç |
| -------------------------- | ---------------------------------------------------------- | ----- |
| Portfolio API/OpenAPI      | API 67/67 toplam; OpenAPI 1/1                              | PASS  |
| Portfolio/transaction IDOR | Bağımsız ownership testleri                                | PASS  |
| Positions cursor IDOR      | User ve portfolio context reddi                            | PASS  |
| Import/export IDOR         | API ve PostgreSQL integration                              | PASS  |
| CSV preview/commit         | Valid, atomic, explicit partial, duplicate ve replay       | PASS  |
| CSV güvenliği              | Formula injection import/export, limit, encoding/delimiter | PASS  |
| Migration                  | Clean migration ve schema validation                       | PASS  |
| Playwright                 | Portfolio 3, Alerts/Watchlists 2, Scanner 3 = **8/8**      | PASS  |
| Accessibility/error states | Portfolio E2E ve web tests                                 | PASS  |

Playwright gerçek tarayıcı akışları manuel başlatılmış API/web süreçleri üzerinde, dynamic routes
önceden derlendikten sonra `--workers=1` ile 8/8 PASS olmuştur. API validation veya ownership
bypass edilmemiştir. CSV security failures **0**, IDOR failures **0**, E2E failures **0**.

## 8. Scanner Runtime ve Alerts/Watchlists baseline regresyonları

### Scanner Runtime

Scanner GO baseline'ındaki 181 runtime, 24 integration, 3 Playwright ve AST round-trip tabanı
korunmuştur. Güncel repository toplamları 347 unit/runtime, 55 integration ve 8 Playwright'tır;
gerekçesiz test sayısı düşüşü yoktur. AST request round-trip E2E PASS'tir.

| ID           |         p50 |         p95 |         Max | Threshold         | Sonuç |
| ------------ | ----------: | ----------: | ----------: | ----------------- | ----- |
| PERF-SCN-001 |    90,59 ms |   109,79 ms |   109,79 ms | warm p95 ≤ 750 ms | PASS  |
| PERF-SCN-002 | 1.839,05 ms | 1.960,74 ms | 1.960,74 ms | p95 ≤ 8.000 ms    | PASS  |
| PERF-SCN-003 | 3.365,04 ms | 3.514,94 ms | 3.514,94 ms | p95 ≤ 15.000 ms   | PASS  |
| PERF-SCN-004 |     0,48 ms |     3,58 ms |     3,58 ms | p95 ≤ 300 ms      | PASS  |
| PERF-SCN-005 |     0,41 ms |     1,24 ms |     1,24 ms | p95 ≤ 250 ms      | PASS  |
| PERF-SCN-006 |     0,74 ms |     0,88 ms |     0,88 ms | p95 ≤ 300 ms      | PASS  |

Scanner threshold'ları **6/6 PASS**, errors **0**.

### Alerts/Watchlists

Alerts/Watchlists GO baseline'ındaki 223 unit/runtime, 41 integration ve 5 Playwright tabanı
korunmuştur. Duplicate evaluation/trigger/delivery, IDOR, note XSS, quiet hours, retry/catch-up ve
notification read/unread regresyonları PASS'tir.

| ID           |         p50 |         p95 |         Max | Threshold       | Sonuç |
| ------------ | ----------: | ----------: | ----------: | --------------- | ----- |
| PERF-AWN-001 |     8,20 ms |    14,20 ms |    18,47 ms | p95 ≤ 250 ms    | PASS  |
| PERF-AWN-002 | 1.645,52 ms | 1.709,96 ms | 1.709,96 ms | p95 ≤ 10.000 ms | PASS  |
| PERF-AWN-003 |     0,90 ms |     1,07 ms |     1,26 ms | p95 ≤ 100 ms    | PASS  |
| PERF-AWN-004 |     1,79 ms |     2,31 ms |     3,31 ms | p95 ≤ 150 ms    | PASS  |
| PERF-AWN-005 |    35,63 ms |    46,60 ms |    46,60 ms | p95 ≤ 750 ms    | PASS  |

Alerts/Watchlists threshold'ları **5/5 PASS**, errors **0**.

## 9. Mandatory portfolio performance baseline

`pnpm perf:portfolio` gerçek test PostgreSQL/Redis, gerçek uygulama yolları ve deterministik
fixture'larla exit code 0 üretmiştir.

| ID            | Fixture                                    | Tekrar | Warm/cold          |       p50 |         p95 |         Max | Hata | Threshold      | Sonuç |
| ------------- | ------------------------------------------ | -----: | ------------------ | --------: | ----------: | ----------: | ---: | -------------- | ----- |
| PERF-PORT-001 | 10.000 posted tx / 100 instrument          |      5 | 1 cold hariç; warm | 504,84 ms |   721,66 ms |   721,66 ms |    0 | p95 ≤ 5.000 ms | PASS  |
| PERF-PORT-002 | 1.000 position / 1.000 price               |      5 | 1 cold hariç; warm | 401,97 ms |   470,82 ms |   470,82 ms |    0 | p95 ≤ 3.000 ms | PASS  |
| PERF-PORT-003 | 1.826 day / 3 cash flow                    |     20 | 1 cold hariç; warm | 134,06 ms |   160,54 ms |   174,36 ms |    0 | p95 ≤ 1.500 ms | PASS  |
| PERF-PORT-004 | 1.826 portfolio+benchmark / 1.000 exposure |     20 | 1 cold hariç; warm |  19,52 ms |    32,35 ms |    32,74 ms |    0 | p95 ≤ 3.000 ms | PASS  |
| PERF-PORT-005 | 10.000 CSV row / 669.203 byte              |      5 | 1 cold hariç; warm | 762,94 ms | 1.169,22 ms | 1.169,22 ms |    0 | p95 ≤ 8.000 ms | PASS  |
| PERF-PORT-006 | 1.000 position / page 50                   |    100 | 1 cold hariç; warm |  21,21 ms |    44,42 ms |   109,32 ms |    0 | p95 ≤ 500 ms   | PASS  |

Mandatory portfolio performance threshold'ları **6/6 PASS**.

## 10. Repository, security ve delivery kapıları

| Kapı                         | Komut / yöntem                                  | Sonuç                         |
| ---------------------------- | ----------------------------------------------- | ----------------------------- |
| Node/pnpm                    | `pnpm version:check`                            | PASS — 22.14.0 / 9.15.4       |
| Format                       | `pnpm format:check`                             | PASS                          |
| ADR                          | `pnpm validate:adr`; validator test             | PASS — 11 ADR, 3/3            |
| Lint, cache dışı             | `pnpm exec turbo run lint --force`              | PASS — 8/8, cached 0          |
| Typecheck, cache dışı        | `pnpm exec turbo run typecheck --force`         | PASS — 8/8, cached 0          |
| Production build             | `pnpm exec turbo run build --force`             | PASS — 8/8, cached 0          |
| Secret synthetic/repository  | `pnpm secret:scan:test`; `pnpm secret:scan`     | PASS — 142 commit, 0 leak     |
| Dependency audit             | `pnpm audit --prod --audit-level high`          | PASS — no known vulnerability |
| Skip/only                    | Repository marker scan                          | PASS — 0 marker               |
| OpenAPI                      | `pnpm --filter @atlas/api openapi:check`        | PASS — 1/1                    |
| Migration/schema             | Clean `db:migrate`; `db:check`                  | PASS                          |
| Unit/runtime                 | Sequential cache-dışı full repository run       | PASS — 347/347                |
| PostgreSQL/Redis integration | Database + CSV + worker                         | PASS — 55/55 assertions       |
| Playwright                   | `pnpm --filter @atlas/web test:e2e --workers=1` | PASS — 8/8                    |
| Portfolio performance        | `pnpm perf:portfolio`                           | PASS — 6/6                    |
| Scanner performance          | `pnpm perf:scanner`                             | PASS — 6/6                    |
| Alerts performance           | `pnpm perf:alerts`                              | PASS — 5/5                    |
| Whitespace                   | `git diff --check`                              | PASS                          |

Performance altyapısında PostgreSQL compose health durumunun init restart penceresinde erken
görünmesi iki hazırlık denemesinde `createdb` bağlantısını kapattı. Runner'a yalnız altyapı
hazırlığını güvenilir kılan, en fazla 30 saniyelik bounded `createdb` retry eklendi. Fixture,
threshold, ölçülen application path veya ürün kodu değiştirilmedi.

## GO kararı

TASK-050'nin F-001 ve F-002 bulguları kapanmıştır. Failed gate, critical deviation, financial/risk
fixture failure, IDOR, CSV security, NaN/Infinity, mandatory performance veya baseline regresyonu
yoktur. Format, ADR, lint, typecheck, build, secret, dependency, OpenAPI, migration, unit,
integration ve E2E kapıları PASS'tir. Portfolio, Transactions and Risk Analytics milestone'ı
**GO** olarak yeniden denetlenmiştir.
