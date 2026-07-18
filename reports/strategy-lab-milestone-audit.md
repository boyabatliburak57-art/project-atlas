# NO-GO — Strategy Lab Milestone Audit

- **Görev:** TASK-070
- **Audit tarihi:** 2026-07-18
- **Audit commit SHA:** `b1bffa00b76f1b0cb628ecb1af28e98b3721ea89`
- **Kapsam:** TASK-063–TASK-069, dört önceki GO baseline'ı ve mevcut çalışma ağacı
- **Ortam:** Apple M1, 8 GiB RAM, macOS 25.5.0, Node.js 22.14.0, pnpm 9.15.4,
  PostgreSQL 17.10, Redis 7.4.9

## Karar özeti

Strategy, deterministic engine, bias/cost fixture'ları, BullMQ backtest runtime, API ve önceki
milestone regresyonları büyük ölçüde PASS'tir. Bununla birlikte GO koşulları sağlanmamıştır.

| Ölçüt                                                 | Sonuç |
| ----------------------------------------------------- | ----: |
| Failed gate grubu                                     |     4 |
| Critical deviation                                    |     3 |
| Mandatory performance scenario failure/not-verifiable |     6 |
| Look-ahead failure                                    |     0 |
| Survivorship failure                                  |     0 |
| Fundamental restatement leakage                       |     0 |
| Corporate-action double count                         |     0 |
| Duplicate fill/trade/result                           |     0 |
| Reproducibility failure                               |     0 |
| IDOR/export security failure                          |     0 |
| NaN/Infinity failure                                  |     0 |
| Önceki milestone regresyonu                           |     0 |
| Full-suite E2E failure                                |     1 |

### Açık bulgular

| ID    | Kritiklik | Bulgu                                                                                                                                                                                                                                                                                              | Etki                                                                                                                          |
| ----- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| F-001 | Critical  | Repository'de `perf:backtest` komutu, Strategy Lab benchmark runner'ı veya PERF-BT raporu yoktur. `guides/BACKTEST_PERFORMANCE_BASELINE.md` yalnız contract ve threshold tanımlar.                                                                                                                 | PERF-BT-001–006 gerçek planner/worker/engine/PostgreSQL yolu üzerinde ölçülemedi; altı mandatory threshold FAIL kabul edildi. |
| F-002 | Critical  | `BacktestSummary` yalnız total return, drawdown, win rate, profit factor, exposure ve total cost üretir. Annualized return, volatility, Sharpe, Sortino, Calmar ve expectancy hesaplanmaz; persistence `turnover: '0'` yazar ve benchmark sonucu üretmez.                                          | Metrics kabul kapısı tamamlanmamıştır; sıfır turnover ölçüm değil sabit değerdir.                                             |
| F-003 | Critical  | Experiment domain/runtime servisi ve PostgreSQL repository integration testinde vardır; fakat API create yalnız `research_experiments` kaydını `queued` oluşturur. Production worker composition yalnız `backtestRun` job'ını işler; experiment orchestration consumer/dispatcher wiring'i yoktur. | API'den oluşturulan experiment'ın child run orchestration ile terminal sonuca ulaşacağı production yolunda doğrulanamaz.      |
| F-004 | High      | Bütün Playwright koşumu trade ikinci sayfa assertion'ında 1 failure verdi; iki sonraki Strategy Lab testi çalışmadı. Aynı dosyanın tek-worker tekrarı 4/4 PASS oldu.                                                                                                                               | E2E kapısı tekrarlanabilir değildir; ilk full-suite failure korunarak E2E FAIL sayılmıştır.                                   |

Threshold gevşetilmedi, fixture küçültülmedi, assertion değiştirilmedi ve mock/no-op performance
yolu başarı kabul edilmedi.

## 1. Repository kapıları

| Kapı                         | Komut/kanıt                                                 | Sonuç                                         |
| ---------------------------- | ----------------------------------------------------------- | --------------------------------------------- |
| Node/pnpm                    | `node --version`; `pnpm --version`; `pnpm version:check`    | PASS — v22.14.0 / 9.15.4                      |
| Format                       | `pnpm format:check`                                         | PASS                                          |
| ADR                          | `pnpm validate:adr`                                         | PASS — 20 ADR                                 |
| Lint, cache dışı             | `pnpm exec turbo run lint --force`                          | PASS — 8/8, cached 0                          |
| Typecheck, cache dışı        | `pnpm exec turbo run typecheck --force`                     | PASS — 8/8, cached 0                          |
| Production build, cache dışı | `NEXT_PUBLIC_API_URL=... pnpm exec turbo run build --force` | PASS — 8/8, cached 0                          |
| Secret test/scan             | `pnpm secret:scan:test`; `pnpm secret:scan`                 | PASS — synthetic detected, 173 commit, 0 leak |
| Dependency audit             | `pnpm audit --prod --audit-level high`                      | PASS — no known vulnerability                 |
| Skip/only                    | test/spec dosyalarında `rg` taraması                        | PASS — 0 marker                               |
| Whitespace                   | `git diff --check`                                          | PASS                                          |
| Migration                    | clean DB üzerinde `db:migrate` iki kez; `db:check`          | PASS — forward ve idempotent replay           |
| OpenAPI                      | `pnpm --filter @atlas/api openapi:check`                    | PASS — 1/1                                    |

### Test envanteri

| Katman                                 |            Sonuç |
| -------------------------------------- | ---------------: |
| Domain unit/runtime                    |     359/359 PASS |
| Database unit/schema                   |       15/15 PASS |
| Worker unit/runtime                    |       32/32 PASS |
| API unit/integration                   |     112/112 PASS |
| Web component                          |       13/13 PASS |
| **Unit/runtime toplamı**               | **531/531 PASS** |
| Database PostgreSQL integration        |       42/42 PASS |
| Worker PostgreSQL/Redis integration    |       52/52 PASS |
| API database integration               |         4/4 PASS |
| **Gerçek altyapı integration toplamı** |   **98/98 PASS** |
| Strategy/backtest domain hedefli       |       71/71 PASS |
| Backtest migration hedefli             |       10/10 PASS |
| Backtest worker hedefli                |       16/16 PASS |
| Backtest API hedefli                   |       11/11 PASS |

## 2. Database ve migration kapıları

TASK-063 tabloları, numeric finansal kolonlar, timestamptz alanlar, owner foreign key/indexleri,
immutable revision unique key, request/idempotency key, data snapshot hash, fill deduplication,
series chunk ve experiment binding unique constraint'leri clean PostgreSQL üzerinde 10/10 PASS
olmuştur. Migration iki ardışık çalıştırmada başarıyla tamamlanmış; `drizzle-kit check` PASS'tir.

## 3. Strategy kapıları

| Kapı                                                                 | Sonuç |
| -------------------------------------------------------------------- | ----- |
| Immutable revision ve optimistic conflict                            | PASS  |
| Entry/exit AST round-trip                                            | PASS  |
| Named parameter default/override/range ve deterministic binding hash | PASS  |
| Stable validation path                                               | PASS  |
| Future bar rejection                                                 | PASS  |
| Fundamental publication/revision availability                        | PASS  |
| Multi-timeframe closed-bar alignment                                 | PASS  |
| Complexity/workload limit                                            | PASS  |
| Clone ve ownership/IDOR                                              | PASS  |
| Eval/free expression/SQL rejection                                   | PASS  |

Strategy domain ve application testleri framework bağımsızdır. Eski revision değişmez; stale
expected revision conflict üretir. Serbest code/eval yolu yoktur.

## 4. Backtest engine kapıları

| Kapı                                                   | Sonuç            |
| ------------------------------------------------------ | ---------------- |
| Deterministic event ve stable symbol ordering          | PASS             |
| Closed-bar signal → next-open order/fill               | PASS             |
| Cash, position, no-short ve no-leverage invariant'ları | PASS             |
| Equal-weight, fixed-cash, fixed-percentage sizing      | PASS             |
| Stop loss, take profit, trailing stop, maximum holding | PASS             |
| Forced exit ve end liquidation                         | PASS             |
| Checkpoint/restore ve uninterrupted-result eşitliği    | PASS             |
| Same input → same result hash                          | PASS             |
| Duplicate event/fill/trade guard                       | PASS             |
| Zero-trade finite result                               | PASS             |
| NaN/Infinity guard                                     | PASS — failure 0 |

## 5. Bias ve veri bütünlüğü kapıları

| Failure türü                    | Fixture/kanıt                                       | Failure |
| ------------------------------- | --------------------------------------------------- | ------: |
| Look-ahead                      | signal context future-bar negative fixture          |       0 |
| Survivorship                    | historical membership interval fixture              |       0 |
| Future listing                  | pre-listing exclusion                               |       0 |
| Historical index membership     | effective-from/to selection                         |       0 |
| Fundamental publication         | before/after publication fixture                    |       0 |
| Fundamental restatement leakage | revision available-at fixture                       |       0 |
| Future index membership leakage | historical membership fixture                       |       0 |
| Same-bar execution leakage      | next-open negative fixture                          |       0 |
| Corporate-action double count   | adjustment mode/position application guard          |       0 |
| Dividend double count           | global duplicate event-id guard ve dividend fixture |       0 |
| Delisting                       | inclusion interval ve versioned settlement policy   |       0 |
| Missing bar                     | zero-price fill üretilmedi                          |       0 |
| Corrected bar                   | revision timeline/data snapshot hash'e dahil        |       0 |
| Data snapshot hash              | deterministic timeline/snapshot identity            |       0 |

Bias fixture'larının tamamı PASS'tir. Dividend fixture nakit krediyi doğrular; duplicate event-id
guard bütün timeline event tiplerinden önce uygulanır. Farklı provider kimlikleriyle aynı ekonomik
olayın deduplication'ı veri snapshot normalizasyon politikasına bağlı kalır.

## 6. Cost ve execution kapıları

| Kapı                                      | Sonuç                                                          |
| ----------------------------------------- | -------------------------------------------------------------- |
| Percentage ve minimum commission          | PASS                                                           |
| Buy/sell yönlü basis-point slippage       | PASS                                                           |
| Fixed fee, tax/market fee                 | PASS                                                           |
| Cost sonrası cash validation              | PASS                                                           |
| Volume participation                      | PASS — deterministic floor partial fill                        |
| Missing volume                            | PASS — unsupported/notEvaluable warning, sentetik likidite yok |
| Stop/take-profit/trailing/maximum holding | PASS                                                           |
| Maximum position weight                   | PASS                                                           |
| Same-bar high/low ambiguity               | PASS — versioned stop-first policy                             |

## 7. Metrics kapıları

| Metrik                               | Sonuç                                    |
| ------------------------------------ | ---------------------------------------- |
| Equity/cash/exposure/drawdown curves | PASS                                     |
| Total return                         | PASS                                     |
| Maximum drawdown                     | PASS                                     |
| Win rate/profit factor               | PASS                                     |
| Zero-trade                           | PASS — finite output                     |
| Methodology/engine policy versions   | PASS                                     |
| Annualized return                    | **FAIL — hesaplanmıyor**                 |
| Volatility                           | **FAIL — hesaplanmıyor**                 |
| Sharpe/Sortino/Calmar                | **FAIL — hesaplanmıyor**                 |
| Expectancy                           | **FAIL — hesaplanmıyor**                 |
| Turnover                             | **FAIL — persistence sabit `0` yazıyor** |
| Benchmark return/series              | **FAIL — engine sonucu üretmiyor**       |

Database şemasındaki nullable metric kolonlarının varlığı hesaplama kanıtı değildir. Bu nedenle
metrics kapısı FAIL'dir.

## 8. Runtime kapıları

| Kapı                                                   | Sonuç                            |
| ------------------------------------------------------ | -------------------------------- |
| Run idempotency ve same-key/different-payload conflict | PASS                             |
| PostgreSQL-authoritative state transitions             | PASS                             |
| Reliable enqueue/catch-up                              | PASS                             |
| Transient retry                                        | PASS                             |
| Checkpoint restore                                     | PASS                             |
| Cooperative cancellation                               | PASS                             |
| Timeout                                                | PASS                             |
| Redis restart/completed-result durability              | PASS                             |
| Duplicate fill/trade/series/result                     | PASS — 0                         |
| Progress ve terminal stability                         | PASS                             |
| Orders/fills/trades/series/summary persistence         | PASS                             |
| Production experiment orchestration                    | **FAIL — worker/API wiring yok** |

Runtime integration testleri gerçek BullMQ, PostgreSQL ve Redis üzerinde 16/16 PASS'tir; ancak
experiment testleri `ResearchExperimentRuntimeService`'i doğrudan kurar. Production
`createDefaultBacktestComposition` yalnız `backtestRun` job adını kabul eder.

## 9. API ve güvenlik kapıları

| Kapı                                             | Sonuç                       |
| ------------------------------------------------ | --------------------------- |
| Strategy/run/experiment ownership ve IDOR        | PASS — failure 0            |
| Result resource ownership                        | PASS                        |
| Trade cursor duplicate/missing                   | PASS — 4-row traversal, 0/0 |
| Cursor run/filter/user context ve invalid cursor | PASS                        |
| Export ownership/IDOR                            | PASS                        |
| CSV formula injection                            | PASS                        |
| Complexity ve rate limit                         | PASS                        |
| Provider revision payload secrecy                | PASS                        |
| Production stack trace suppression               | PASS                        |
| OpenAPI                                          | PASS                        |

PERF-BT-004'te istenen 10.000 trade gerçek HTTP/PostgreSQL cursor ölçümü bulunmadığı için API
fixture PASS'i performance yerine kullanılmamıştır.

## 10. Experiments

| Kapı                                                    | Sonuç    |
| ------------------------------------------------------- | -------- |
| Grid combination count ve bound                         | PASS     |
| Deterministic combination order                         | PASS     |
| Duplicate binding guard                                 | PASS     |
| Compatible run reuse                                    | PASS     |
| Partial failure                                         | PASS     |
| Cancellation propagation                                | PASS     |
| Holdout separation                                      | PASS     |
| Comparison matrix ve export API                         | PASS     |
| Overfitting warning input/UI                            | PASS     |
| API → production orchestration → child run terminal yol | **FAIL** |

## 11. Web, E2E ve accessibility

Strategy builder, AST validation request round-trip, revision/clone, backtest request payload,
progress/completion, results/charts/trades, cancellation, grid experiment, holdout comparison,
safe IDOR rendering ve keyboard smoke senaryoları vardır.

| Koşum                                                  | Sonuç                                                                               |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `pnpm --filter @atlas/web test:e2e`                    | **FAIL — 12 PASS, 1 FAIL, 2 did not run**                                           |
| Failure                                                | Trade ikinci sayfa çağrısı tamamlanmadan `tradePages === 2` assertion'ı; received 1 |
| `playwright test e2e/strategy-lab.spec.ts --workers=1` | 4/4 PASS                                                                            |
| Önceki milestone Playwright testleri                   | 11/11 PASS                                                                          |
| Web component/accessibility                            | 13/13 PASS                                                                          |

Tek-worker tekrar PASS olsa da bütün suite ilk koşumda kararlı biçimde geçmediği için E2E ve
accessibility GO birleşik kapısı PASS sayılmamıştır.

## 12. Mandatory Strategy Lab performance

Repository taraması `package.json`, `apps/*/package.json`, `scripts/`, `apps/**/performance/` ve
`reports/performance/` altında backtest benchmark entrypoint'i veya raporu bulmamıştır. Yalnız
Scanner, Alerts/Watchlists, Portfolio/Risk ve Market Intelligence runner'ları vardır. Bu nedenle
ölçüm uydurulmamış ve adapter/mock yoluyla başarı üretilmemiştir.

| ID          | Environment      | Fixture                                                                        | Concurrency | Tekrar | p50 | p95 | Max | Engine/DB/persistence | Memory | Errors    | Threshold                           | Sonuç    |
| ----------- | ---------------- | ------------------------------------------------------------------------------ | ----------- | -----: | --: | --: | --: | --------------------- | ------ | --------- | ----------------------------------- | -------- |
| PERF-BT-001 | N/V — runner yok | 650 symbol × 5 yıl daily × 4 indicator; real planner/worker/engine/persistence | N/V         |      0 | N/V | N/V | N/V | N/V                   | N/V    | ölçüm yok | queue-terminal p95 ≤ 30 s           | **FAIL** |
| PERF-BT-002 | N/V — runner yok | 5.000.000 ordered event; deterministic core                                    | N/V         |      0 | N/V | N/V | N/V | N/V                   | N/V    | ölçüm yok | p95 ≤ 12 s                          | **FAIL** |
| PERF-BT-003 | N/V — runner yok | 100.000 combined persisted order/fill/trade/series event                       | N/V         |      0 | N/V | N/V | N/V | N/V                   | N/V    | ölçüm yok | p95 ≤ 8 s                           | **FAIL** |
| PERF-BT-004 | N/V — runner yok | summary; 2.000 series point; 10.000 trade cursor                               | N/V         |      0 | N/V | N/V | N/V | N/V                   | N/V    | ölçüm yok | 500/700/500 ms; duplicate/missing 0 | **FAIL** |
| PERF-BT-005 | N/V — runner yok | 100 grid combination orchestration                                             | N/V         |      0 | N/V | N/V | N/V | N/V                   | N/V    | ölçüm yok | overhead p95 ≤ 3 s; duplicate run 0 | **FAIL** |
| PERF-BT-006 | N/V — runner yok | aynı snapshot üzerinde iki bağımsız run                                        | N/V         |      0 | N/A | N/A | N/A | N/V                   | N/V    | ölçüm yok | summary/fill/equity hash equal      | **FAIL** |

Mandatory threshold başarısızlığında non-zero dönen bir backtest benchmark komutu da mevcut
değildir. Bu eksiklik tek başına milestone'u NO-GO yapar.

## 13. Önceki milestone regresyonları

Dört GO baseline raporu okundu ve aynı resmi performance runner'ları gerçek PostgreSQL/Redis
altyapısıyla yeniden çalıştırıldı.

| Baseline            | Unit/runtime baseline → güncel | Integration baseline → güncel |        E2E | Performance        | Sonuç |
| ------------------- | -----------------------------: | ----------------------------: | ---------: | ------------------ | ----- |
| Scanner Runtime     |                      181 → 531 |                       24 → 98 |   3/3 PASS | PERF-SCN 6/6 PASS  | PASS  |
| Alerts/Watchlists   |                      223 → 531 |                       41 → 98 |   5/5 PASS | PERF-AWN 5/5 PASS  | PASS  |
| Portfolio/Risk      |                      347 → 531 |                       55 → 98 |   8/8 PASS | PERF-PORT 6/6 PASS | PASS  |
| Market Intelligence |                      446 → 531 |                       68 → 98 | 11/11 PASS | PERF-MKT 6/6 PASS  | PASS  |

Son yeniden ölçümlerde:

- Scanner p95 değerleri: 178,72 / 2.380,36 / 3.651,95 / 2,48 / 1,26 / 1,77 ms.
- Alerts/Watchlists p95 değerleri: 17,01 / 1.736,70 / 1,24 / 2,81 / 77,00 ms.
- Portfolio/Risk p95 değerleri: 126,81 / 120,00 / 40,75 / 5,79 / 158,41 /
  44,67 ms.
- Market Intelligence p95 değerleri: 58,56 / 15,42 / 32,53 / 97,68 / 23,78 /
  2.774,19 ms.

Önceki fixture ve threshold'lar değiştirilmemiştir. Security, format ve build kapılarında
regresyon yoktur; gerekçesiz test sayısı düşüşü bulunmamıştır.

## 14. GO koşulları

| Koşul                                           | Sonuç                                             |
| ----------------------------------------------- | ------------------------------------------------- |
| Failed = 0                                      | FAIL — 4 gate grubu                               |
| Critical deviations = 0                         | FAIL — 3                                          |
| Look-ahead/survivorship/restatement leakage = 0 | PASS                                              |
| Corporate-action double count = 0               | PASS                                              |
| Duplicate fill/trade/result = 0                 | PASS                                              |
| Reproducibility failures = 0                    | PASS — functional fixture; PERF-BT-006 ölçümü yok |
| IDOR/export security failures = 0               | PASS                                              |
| NaN/Infinity failures = 0                       | PASS                                              |
| Mandatory performance thresholds = PASS         | FAIL — 0/6 verified                               |
| Previous milestone regressions = 0              | PASS                                              |
| Format/ADR/secret/dependency/build = PASS       | PASS                                              |
| E2E/accessibility = PASS                        | FAIL — full suite 1 failure                       |

## Nihai karar

Strategy Lab milestone **NO-GO**'dur. Zorunlu backtest performance runner ve raporlama yolu,
eksik analytics metrikleri, production experiment orchestration wiring'i ve kararlı full-suite
Playwright sonucu tamamlanmadan sonraki pakete geçilmesi önerilmez.
