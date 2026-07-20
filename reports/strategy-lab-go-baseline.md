# Strategy Lab GO Baseline

- **Durum:** GO
- **Görev:** TASK-071
- **Baseline tarihi:** 2026-07-20
- **Baseline commit SHA:** `13dc51e17afe893f73bf9165d19b8b4e3be1d968`
- **Kaynak re-audit SHA:** `89ff250a1a12579a32956a217f7ac7e18ecc2c9b`
- **Kaynak rapor:** `reports/strategy-lab-milestone-reaudit.md`
- **Kanonik performans raporu:** `reports/performance/backtest-benchmark.json` ve `.md`
- **Playwright kanıtı:** `reports/strategy-lab-e2e-stability.md`

Baseline commit, Strategy Lab implementasyonlarını ve TASK-070A–TASK-070E remediation
sonuçlarını içerir. Çalışma ağacındaki v0.9 README, indeks ve changelog değişiklikleri
dokümantasyonla sınırlıdır; bu baseline'ın kod davranışını, testlerini, fixture'larını veya
threshold'larını değiştirmez.

## Karar özeti

| GO ölçütü                                  | Sonuç |
| ------------------------------------------ | ----: |
| Failed gate                                |     0 |
| Critical deviation                         |     0 |
| Eksik backtest metriği                     |     0 |
| Hard-coded turnover production occurrence  |     0 |
| PERF-BT-001–PERF-BT-006 failure            |     0 |
| Production experiment path failure         |     0 |
| Duplicate child/fill/trade/result          |     0 |
| Bias/data-integrity failure                |     0 |
| IDOR/export security failure               |     0 |
| Önceki milestone regresyonu                |     0 |
| Playwright not-run/flaky/retry-only/skip   |     0 |
| Format/ADR/secret/dependency/build failure |     0 |

TASK-070E GO koşullarının tamamı sağlanmıştır.

## Backtest metric completeness

`backtest-metrics-v2` aşağıdaki mandatory metriklerin tamamını gerçek hesaplama yoluyla üretir:

- annualized return,
- annualized volatility,
- Sharpe ratio,
- Sortino ratio,
- Calmar ratio,
- expectancy,
- benchmark return,
- excess return,
- turnover.

Her metrik `value`, `status`, `reasonCode`, `observationCount`, `methodologyVersion` ve
`warnings` alanlarını taşır. Known-value metric ve execution fixture'ları **46/46 PASS**;
summary API **11/11 PASS** ve OpenAPI **1/1 PASS** sonucundadır. Zero volatility, zero drawdown,
zero closed-trade ve eksik benchmark durumları `notEvaluable` döndürür. Public veya persistent
NaN/Infinity sayısı **0**'dır.

Methodology snapshot:

- simple close-to-close return,
- volatility annualization factor 252,
- annualized return day count 365,
- yıllık risk-free rate 0,
- sample standard deviation ve periodic downside target 0,
- synthetic corporate-action fill'leri hariç gross fill notional / average equity turnover,
- turnover annualization yok,
- benchmark için aynı range, cutoff ve adjustment mode ile exact-date intersection; forward-fill yok.

### Hard-coded turnover taraması

Production kaynakları test/spec dosyaları hariç taranmıştır. Hard-coded sıfır turnover production
occurrence sayısı: **0 — PASS**. Turnover gerçek fill notional ve average portfolio equity üzerinden
hesaplanır.

## PERF-BT-001–PERF-BT-006 baseline

Komut: `pnpm perf:backtest` — exit 0. Ortam: macOS `darwin 25.5.0`, Apple M1, 8 GiB,
Node `22.14.0`, pnpm `9.15.4`, PostgreSQL `17.10`, Redis `7.4.9`.

| ID                  | Fixture / gerçek yol                                                      | Tekrar |    p50 ms |    p95 ms |    max ms | Threshold       | Invariant                                              | Sonuç |
| ------------------- | ------------------------------------------------------------------------- | -----: | --------: | --------: | --------: | --------------- | ------------------------------------------------------ | ----- |
| PERF-BT-001         | 650 symbol × 1.304 daily bar × 4 indicator; planner/worker/engine/persist |      3 | 23.765,76 | 27.495,19 | 27.495,19 | p95 ≤ 30.000 ms | terminal 3/3; error 0                                  | PASS  |
| PERF-BT-002         | 5.000.000 ordered event; deterministic core ve gerçek cost model          |      5 |  6.681,83 |  7.298,04 |  7.298,04 | p95 ≤ 12.000 ms | result hash count 1; invalid order 0                   | PASS  |
| PERF-BT-003         | 100.000 combined order/fill/trade/series; PostgreSQL persistence          |      5 |  5.187,88 |  5.468,95 |  5.468,95 | p95 ≤ 8.000 ms  | idempotent replay true                                 | PASS  |
| PERF-BT-004 summary | gerçek HTTP/auth/controller/application/repository/serialization          |     10 |      4,98 |     10,07 |     10,07 | p95 ≤ 500 ms    | real HTTP                                              | PASS  |
| PERF-BT-004 series  | aynı gerçek HTTP yolu; 2.000 point                                        |     10 |     19,30 |     23,85 |     23,85 | p95 ≤ 700 ms    | requested point 2.000                                  | PASS  |
| PERF-BT-004 trades  | aynı gerçek HTTP yolu; 10.000 trade ve cursor traversal                   |    100 |      6,57 |      8,74 |     17,96 | p95 ≤ 500 ms    | duplicate trade 0; missing trade 0                     | PASS  |
| PERF-BT-005         | 100 combination; production experiment queue/worker/reuse/aggregation     |      5 |     85,55 |    104,06 |    104,06 | p95 ≤ 3.000 ms  | production job registered; duplicate child run 0       | PASS  |
| PERF-BT-006         | aynı data snapshot üzerinde iki bağımsız gerçek run                       |      2 |      7,76 |     15,34 |     15,34 | hash equality   | summary, fill sequence ve equity series hash'leri eşit | PASS  |

Kanonik fixture `performance/fixtures/backtest-v1.json`, threshold sözleşmesi
`performance/thresholds/backtest.json` dosyasıdır. Eksik/skipped senaryo yoktur; fixture ve
threshold kapsamı değiştirilmemiştir.

## Experiment production worker

API → application service → PostgreSQL → reliable dispatch → BullMQ experiment queue → production
WorkerRuntime → combination generator → child backtest create/reuse → result aggregator → terminal
PostgreSQL state yolu **PASS** sonucundadır. Authoritative experiment PostgreSQL'den yüklenir ve job
payload yalnız `experimentId` taşır.

| Kanıt                                                | Sonuç      |
| ---------------------------------------------------- | ---------- |
| Production dispatch database testi                   | 1/1 PASS   |
| Production worker integration                        | 15/15 PASS |
| API create → production queue → terminal state       | PASS       |
| 2+ ve 100 combination orchestration                  | PASS       |
| Compatible completed-run reuse                       | PASS       |
| Incompatible snapshot/policy no-reuse                | PASS       |
| Retry, worker restart ve Redis restart               | PASS       |
| Partial failure, cancellation ve terminal-state race | PASS       |
| Aggregation idempotency                              | PASS       |

### Duplicate invariant'ları

| Invariant           | Sayı | Sonuç |
| ------------------- | ---: | ----- |
| Duplicate child run |    0 | PASS  |
| Duplicate fill      |    0 | PASS  |
| Duplicate trade     |    0 | PASS  |
| Duplicate result    |    0 | PASS  |

## Playwright full-suite stability

Playwright `fullyParallel: true`, normal worker sayısı 4 ve retry 0 ile çalıştırılmıştır.
Single-worker Strategy Lab sonucu tek başına milestone kanıtı olarak kullanılmamıştır.

| Koşum                                     | Sonuç      |    Süre |
| ----------------------------------------- | ---------- | ------: |
| Full suite normal worker — ardışık 1      | 15/15 PASS | 43,0 sn |
| Full suite normal worker — ardışık 2      | 15/15 PASS | 54,2 sn |
| Strategy Lab normal worker                | 4/4 PASS   | 34,7 sn |
| Strategy Lab single worker, ek kanıt      | 4/4 PASS   | 33,4 sn |
| Düzeltilen payload/cursor testi 10 tekrar | 10/10 PASS | 54,2 sn |

| Suite bütünlüğü sayacı | Sayı |
| ---------------------- | ---: |
| Failed                 |    0 |
| Not-run                |    0 |
| Flaky                  |    0 |
| Retry-only             |    0 |
| Skip                   |    0 |
| Fixme                  |    0 |
| Only                   |    0 |

## Bias ve data-integrity

Deterministic core **18/18**, execution-cost/data-integrity **25/25 PASS** sonucundadır.

| Kapı                                              | Failure | Sonuç |
| ------------------------------------------------- | ------: | ----- |
| Look-ahead ve same-bar leakage                    |       0 | PASS  |
| Survivorship, future listing ve future membership |       0 | PASS  |
| Fundamental publication/restatement leakage       |       0 | PASS  |
| Corporate-action ve dividend double-count         |       0 | PASS  |
| Missing/corrected bar ve data snapshot hash       |       0 | PASS  |
| NaN/Infinity                                      |       0 | PASS  |

## API, IDOR ve export güvenliği

| Kapı                                             | Sonuç                        |
| ------------------------------------------------ | ---------------------------- |
| Strategy ownership ve IDOR                       | PASS — failure 0             |
| Backtest run/result ownership ve IDOR            | PASS — failure 0             |
| Experiment ownership ve IDOR                     | PASS — failure 0             |
| Trade cursor user/run/filter/sort context        | PASS; duplicate 0, missing 0 |
| Export ownership ve IDOR                         | PASS — failure 0             |
| CSV formula injection escaping                   | PASS — failure 0             |
| Complexity/rate limit ve production error safety | PASS                         |
| Stack trace/provider revision suppression        | PASS                         |

## Önceki milestone regresyonları

| Baseline            | Test/E2E/security                                    | Performans p95 ms                                                   | Sonuç |
| ------------------- | ---------------------------------------------------- | ------------------------------------------------------------------- | ----- |
| Scanner Runtime     | baseline 181; AST round-trip ve IDOR full E2E içinde | 267,10 / 2.528,10 / 5.021,19 / 8,32 / 1,67 / 2,04                   | PASS  |
| Alerts/Watchlists   | baseline 223; E2E ve IDOR PASS                       | PERF-AWN iki bağımsız koşum PASS; PERF-AWN-002 1.705,23 ve 1.459,14 | PASS  |
| Portfolio/Risk      | baseline 347; financial/CSV/E2E/IDOR PASS            | 232,42 / 114,72 / 49,15 / 6,77 / 324,76 / 10,34                     | PASS  |
| Market Intelligence | baseline 446; E2E, IDOR ve look-ahead PASS           | 4,15 / 4,58 / 27,59 / 67,04 / 10,47 / 5.223,20                      | PASS  |

Scanner Runtime, Alerts/Watchlists, Portfolio/Risk ve Market Intelligence regresyon sayıları
**0**'dır. Gerekçesiz test sayısı düşüşü yoktur.

## Repository quality ve security snapshot

| Kapı                                | Baseline sonucu       |
| ----------------------------------- | --------------------- |
| Format                              | PASS                  |
| ADR validation                      | PASS                  |
| Secret scan                         | PASS; leak 0          |
| Dependency audit                    | PASS; high/critical 0 |
| Production build, cache dışı        | 8/8 PASS              |
| Lint, cache dışı                    | 8/8 PASS              |
| Typecheck, cache dışı               | 8/8 PASS              |
| Unit/runtime                        | 554/554 PASS          |
| Database integration                | 42/42 PASS            |
| API database integration            | 5/5 PASS              |
| Worker PostgreSQL/Redis integration | 67/67 PASS            |
| OpenAPI                             | 1/1 PASS              |
| Migration forward/rollback          | PASS                  |
| Skip/only/fixme scan                | PASS; occurrence 0    |
| `git diff --check`                  | PASS                  |

## Baseline kararı

Strategy Lab milestone; mandatory backtest metrikleri, gerçek turnover, PERF-BT-001–006,
production experiment worker, deterministic/bias kapıları, IDOR/export güvenliği, kararlı tam
Playwright suite ve önceki dört milestone regresyonuyla **GO** baseline olarak sabitlenmiştir.

Failed gate veya critical deviation yoktur. TASK-072 bağımlılık kapısı sağlanmıştır. Bu baseline
kod davranışını, testleri, fixture'ları veya performance threshold'larını değiştirmez.
