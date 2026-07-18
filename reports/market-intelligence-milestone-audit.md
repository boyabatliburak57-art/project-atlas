# GO — Market Intelligence Milestone Audit

- **Görev:** TASK-060
- **Audit tarihi:** 2026-07-18
- **Audit commit SHA:** `8b4aaefc60d03141d8180abbebfcfb37ea6566fa`
- **Kapsam:** TASK-053–TASK-059 kodu, migration'ları, testleri, E2E akışları ve zorunlu
  performans senaryoları
- **Çalışma ağacı:** Audit commit'i üzerindeki henüz commit edilmemiş TASK-059 web değişiklikleri,
  yeniden üretilen performance raporları ve bu audit raporu dahil edilmiştir.

## Karar özeti

| GO ölçütü                      | Sonuç |
| ------------------------------ | ----: |
| Failed gate                    |     0 |
| Critical deviation             |     0 |
| Cursor/chart invariant failure |     0 |
| Fundamental fixture failure    |     0 |
| Pattern fixture failure        |     0 |
| Pattern look-ahead failure     |     0 |
| IDOR/security failure          |     0 |
| NaN/Infinity failure           |     0 |
| Mandatory performance failure  |     0 |
| Scanner Runtime regression     |     0 |
| Alerts/Watchlists regression   |     0 |
| Portfolio/Risk regression      |     0 |
| E2E/accessibility failure      |     0 |

TASK-060 GO koşullarının tamamı sağlanmıştır. Test skip, assertion azaltma, fixture küçültme,
threshold gevşetme veya mock/no-op performans yolu kullanılmamıştır.

## 1. Repository kapıları

| Kapı                         | Komut                                                       | Sonuç                            |
| ---------------------------- | ----------------------------------------------------------- | -------------------------------- |
| Node ve pnpm                 | `pnpm version:check`                                        | PASS — Node 22.14.0, pnpm 9.15.4 |
| Format                       | `pnpm format:check`                                         | PASS                             |
| ADR                          | `pnpm validate:adr`                                         | PASS — 15 ADR                    |
| Lint, cache dışı             | `pnpm exec turbo run lint --force`                          | PASS — 8/8, cached 0             |
| Typecheck, cache dışı        | `pnpm exec turbo run typecheck --force`                     | PASS — 8/8, cached 0             |
| Production build, cache dışı | `NEXT_PUBLIC_API_URL=... pnpm exec turbo run build --force` | PASS — 8/8, cached 0             |
| Synthetic secret scan        | `pnpm secret:scan:test`                                     | PASS                             |
| Repository/history secrets   | `pnpm secret:scan`                                          | PASS — 158 commit, 0 leak        |
| Dependency audit             | `pnpm audit --prod --audit-level high`                      | PASS — no known vulnerability    |
| Skip/only                    | Test kaynaklarında `rg` marker taraması                     | PASS — 0 marker                  |
| Whitespace                   | `git diff --check`                                          | PASS                             |
| Migration schema             | `pnpm --filter @atlas/database db:check`                    | PASS                             |
| Clean migration              | İzole PostgreSQL üzerinde `db:migrate`                      | PASS                             |
| OpenAPI                      | `pnpm --filter @atlas/api openapi:check`                    | PASS — 1/1                       |

Cache dışı repository test tabanı:

| Paket             |        Sonuç |
| ----------------- | -----------: |
| `@atlas/domain`   | 288/288 PASS |
| `@atlas/database` |   13/13 PASS |
| `@atlas/worker`   |   31/31 PASS |
| `@atlas/api`      | 101/101 PASS |
| `@atlas/web`      |   13/13 PASS |
| **Toplam**        |  **446/446** |

Gerçek altyapı integration sonucu PostgreSQL 32/32 ve PostgreSQL/Redis worker 36/36 olmak üzere
**68/68 PASS** olmuştur. İzole PostgreSQL 17 ve Redis 7 container, test sonunda volume'larıyla
birlikte kaldırılmıştır.

## 2. Database ve read model kapıları

| Kontrol                           | Kanıt                                                                | Sonuç |
| --------------------------------- | -------------------------------------------------------------------- | ----- |
| Clean migration                   | Boş schema'ya bütün migration'lar; ikinci migration idempotent       | PASS  |
| DB-007 tabloları ve timestamptz   | Sekiz Market Intelligence tablosu integration testi                  | PASS  |
| Snapshot unique constraint        | Snapshot identity ve generation context ihlalleri reddedildi         | PASS  |
| Ranking stable order              | Rank, sort value ve instrument tie-breaker                           | PASS  |
| Ranking duplicate guard           | Aynı rank ve instrument generation içinde reddedildi                 | PASS  |
| Generation consistency            | Overview, sector ve ranking tek generation/cutoff                    | PASS  |
| Fundamental revision preservation | Provider revision overwrite edilmeden immutable revision             | PASS  |
| Ratio formula version             | Formula version kimliği ayrı snapshot olarak saklandı                | PASS  |
| Pattern deduplication             | Deduplication key unique; algorithm version eski kaydı ezmedi        | PASS  |
| Numeric alanlar                   | Finansal ve ratio değerleri PostgreSQL numeric; missing değer `null` | PASS  |
| Closed-bar invalidation           | Eski snapshot invalidation ve rebuild port çağrısı                   | PASS  |
| Idempotent snapshot generation    | Aynı generation tekrarında duplicate snapshot/ranking oluşmadı       | PASS  |

Market Intelligence database fixture paketi **9/9 PASS** olmuştur.

## 3. Market overview kapıları

| Kontrol                            | Sonuç                             |
| ---------------------------------- | --------------------------------- |
| Index summary ve quality metadata  | PASS                              |
| Breadth evaluated/excluded count   | PASS — eksikler paydaya eklenmedi |
| Complete/partial/stale             | PASS                              |
| Sector aggregation                 | PASS — aynı generation/cutoff     |
| Opaque versioned ranking cursor    | PASS                              |
| İlk/orta/son sayfa                 | PASS                              |
| Equal-value stable tie-breaker     | PASS                              |
| Duplicate row                      | 0 — PASS                          |
| Missing row                        | 0 — PASS                          |
| New closed-bar cursor invalidation | PASS                              |
| Backend rate limit                 | PASS                              |
| Generation/cutoff consistency      | PASS                              |
| Provider payload secrecy           | PASS                              |

Market overview API paketi **17/17 PASS** olmuştur. Unsupported ranking type, malformed cursor ve
missing snapshot standard hata sözleşmeleriyle reddedilmiştir.

## 4. Chart ve symbol kapıları

| Kontrol                                      | Sonuç               |
| -------------------------------------------- | ------------------- |
| Raw/adjusted cache ve response ayrımı        | PASS                |
| Daily/intraday timeframe ve range            | PASS                |
| Bar sırası ve duplicate bar guard            | PASS                |
| Overlay/panel timestamp alignment            | PASS — failure 0    |
| Indicator code/version/parameter/output meta | PASS                |
| Multi-output panel                           | PASS                |
| Open/closed bar işareti                      | PASS                |
| Corporate action marker dedup                | PASS                |
| Pattern marker                               | PASS                |
| User alert/transaction marker ownership      | PASS                |
| Foreign-user marker IDOR                     | PASS — veri dönmedi |
| Range ve altı-overlay limitleri              | PASS                |
| Provider raw payload suppression             | PASS                |
| NaN/Infinity guard                           | PASS — failure 0    |
| CHART_DATA_CONTRACT                          | PASS                |

Symbol/chart API paketi **11/11 PASS** olmuştur. PERF-MKT-004 üzerinde 730 bar, volume, altı
indicator ve corporate-action marker için alignment failure sıfırdır.

## 5. Fundamentals kapıları

| Kontrol                               | Sonuç               |
| ------------------------------------- | ------------------- |
| Annual ve quarterly statement         | PASS                |
| Restatement immutable revision        | PASS                |
| Missing metric != zero                | PASS                |
| Unit normalization                    | PASS                |
| Currency mismatch policy              | PASS                |
| TTM dört uyumlu dönem                 | PASS                |
| TTM insufficient/incompatible         | PASS — notEvaluable |
| Denominator zero                      | PASS — notEvaluable |
| Negative denominator policy           | PASS                |
| Market/financial cutoff ayrımı        | PASS                |
| Revenue/net income growth             | PASS                |
| Provider transient/permanent taxonomy | PASS                |
| Duplicate provider batch              | PASS — idempotent   |
| NaN/Infinity guard                    | PASS — failure 0    |

Fundamentals saf fixture paketi **12/12**, worker ingestion paketi **3/3** ve API paketi **3/3
PASS** olmuştur. Gerçek provider, scraping veya secret eklenmemiştir.

## 6. Pattern kapıları

Mandatory registry 16 definition içerir: doji, hammer, inverted hammer, bullish/bearish
engulfing, 20/55 high breakout, 20/55 low breakdown, golden/death cross, volume-confirmed
breakout, double top/bottom candidate ve ascending/descending triangle candidate.

| Kontrol                                | Sonuç               |
| -------------------------------------- | ------------------- |
| Her mandatory pattern positive fixture | 16/16 PASS          |
| Near-miss ve constant series           | PASS                |
| No-look-ahead                          | PASS                |
| Future/open bar dışlama                | PASS                |
| Short input                            | PASS — notEvaluable |
| Missing volume                         | PASS — notEvaluable |
| Candidate/confirmed/invalidated        | PASS                |
| Duplicate closed-bar event             | PASS — duplicate 0  |
| Adjustment consistency                 | PASS                |
| Algorithm version preservation         | PASS                |
| Evidence/dedup key determinism         | PASS                |
| NaN/Infinity guard                     | PASS — failure 0    |

Pattern domain paketi **24/24**, worker persistence/state paketi **2/2** ve API paketi **3/3
PASS** olmuştur.

**Pattern look-ahead failures: 0.**

## 7. Cache ve kalite kapıları

| Kontrol                          | Sonuç                           |
| -------------------------------- | ------------------------------- |
| New closed bar invalidation      | PASS                            |
| Corrected price bar invalidation | PASS                            |
| Corporate action revision        | PASS                            |
| Financial restatement refresh    | PASS — fundamentals + ratio     |
| Ratio formula version            | PASS                            |
| Indicator version                | PASS                            |
| Pattern algorithm version        | PASS                            |
| Instrument sector/index değişimi | PASS                            |
| Redis restart/loss fallback      | PASS — PostgreSQL authoritative |
| Duplicate queue delivery         | PASS — idempotent               |
| Cache context mismatch/poisoning | PASS — rejected                 |
| Cross-user marker isolation      | PASS                            |
| Snapshot generation consistency  | PASS                            |
| Bounded query count              | PASS                            |
| Admin-safe diagnostics           | PASS                            |
| Provider payload secrecy         | PASS                            |

Cache/quality domain paketi **17/17** ve PostgreSQL/Redis reconciliation paketi **3/3 PASS**
olmuştur.

## 8. Web ve E2E kapıları

`pnpm --filter @atlas/web test:e2e --workers=1`: **11/11 PASS**.

| Akış                                      | Sonuç |
| ----------------------------------------- | ----- |
| Market overview                           | PASS  |
| Ranking'den symbol detail'e geçiş         | PASS  |
| Chart timeframe                           | PASS  |
| Adjustment request round-trip             | PASS  |
| Altı overlay request round-trip           | PASS  |
| Corporate action/pattern marker           | PASS  |
| Annual/quarterly financial periods        | PASS  |
| Restatement ve notEvaluable gösterimi     | PASS  |
| Pattern candidate evidence ve uyarı       | PASS  |
| Watchlist entegrasyonu                    | PASS  |
| Alert entegrasyonu                        | PASS  |
| Portfolio transaction symbol handoff      | PASS  |
| Foreign-user marker görünmezliği          | PASS  |
| Partial/stale/error state                 | PASS  |
| Keyboard, visible focus ve text chart alt | PASS  |

Market Intelligence için eklenen Playwright akışları **3/3**, web component/accessibility
fixture'ları **5/5 PASS** olmuştur. Up/down yalnız renkle ifade edilmemiş; missing ve
notEvaluable değerler sıfır gösterilmemiştir. Provider/internal hata ayrıntısı public UI'ya
taşınmamıştır.

## 9. Mandatory performance baseline

Ortam: Apple M1, 8 GiB RAM, macOS 25.5.0, Node 22.14.0, pnpm 9.15.4, PostgreSQL 17 ve Redis 7.
HTTP senaryoları gerçek Nest HTTP → controller → application service → PostgreSQL read model → DTO
serialization yolunu; pattern senaryosu BullMQ → closed-bar worker → pure executor → PostgreSQL
persistence yolunu kullanmıştır. Dış provider ve internet kullanılmamıştır.

| ID           | Fixture                          |           Tekrar | Warm/cold                      |   p50 ms |   p95 ms |   Max ms | Hata | Query count                         | Cache hit/miss | Threshold                              | Sonuç |
| ------------ | -------------------------------- | ---------------: | ------------------------------ | -------: | -------: | -------: | ---: | ----------------------------------- | -------------- | -------------------------------------- | ----- |
| PERF-MKT-001 | 650 active BIST                  | 7 cold + 25 warm | response cache                 |     2,52 |    14,04 |    14,67 |    0 | cold 1 / warm 0 query               | 25/7           | warm p95 ≤ 500; cold p95 42,92 ≤ 1.200 | PASS  |
| PERF-MKT-002 | 650 ranking, page 50             |      7 traversal | her opaque cursor sayfası cold |     4,09 |    10,19 |    15,67 |    0 | 1 keyset query/page; 13 page        | 0/91           | p95 ≤ 400; duplicate/missing 0         | PASS  |
| PERF-MKT-003 | profile + quote + signal         |               12 | DB read path                   |     5,69 |    44,59 |    44,59 |    0 | 7 logical query/repetition          | 0/0            | p95 ≤ 700                              | PASS  |
| PERF-MKT-004 | 730 bar, volume + 6 overlay + CA | 7 cold + 20 warm | response cache                 |    54,08 |    94,01 |    94,01 |    0 | 3 logical query/cold HTTP           | 20/1           | cold p95 ≤ 900; alignment 0            | PASS  |
| PERF-MKT-005 | 20 period + 14 ratio             |               20 | DB + ratio calculation         |     6,59 |    10,21 |    10,75 |    0 | 4 query/HTTP                        | 0/0            | p95 ≤ 500                              | PASS  |
| PERF-MKT-006 | 650 × 201 bar × 16 pattern       |                3 | cold + 2 idempotent replay     | 2.247,29 | 2.445,15 | 2.445,15 |    0 | 1 bulk load + seed + chunked writes | 0/0            | p95 ≤ 12.000; duplicate/look-ahead 0   | PASS  |

Ek invariant sonuçları:

- PERF-MKT-002 duplicate row **0**, missing row **0**.
- PERF-MKT-004 timestamp alignment failure **0**.
- PERF-MKT-006 persisted pattern **4.550**, duplicate pattern **0**, look-ahead failure **0**.
- Threshold veya fixture boyutları değiştirilmemiştir.

Audit sırasında PERF-MKT-001 ve PERF-MKT-002 JSON raporunda eksik olan query/cache metadata'sı
tamamlanmış ve ranking cache durumu benzersiz cursor sayfalarının gerçek davranışını gösterecek
şekilde düzeltilmiştir. Bu değişiklik yalnız benchmark gözlemlenebilirliğidir; ürün kodu, fixture,
threshold, assertion ve ölçülen yol değişmemiştir. Benchmark yeniden çalıştırılmış ve exit code 0
üretmiştir.

## 10. Önceki milestone regresyonları

### Test ve E2E tabanı

| Baseline          | Baseline unit/runtime | Güncel | Baseline integration | Güncel | Baseline E2E | Güncel | Sonuç |
| ----------------- | --------------------: | -----: | -------------------: | -----: | -----------: | -----: | ----- |
| Scanner Runtime   |                   181 |    446 |                   24 |     68 |            3 |     11 | PASS  |
| Alerts/Watchlists |                   223 |    446 |                   41 |     68 |            5 |     11 | PASS  |
| Portfolio/Risk    |                   347 |    446 |                   55 |     68 |            8 |     11 | PASS  |

Gerekçesiz test sayısı düşüşü yoktur. Scanner AST round-trip, Alerts/Watchlists lifecycle,
Portfolio CSV/IDOR/accessibility ve yeni Market Intelligence E2E akışları PASS'tir.

### Scanner Runtime performance

| ID           |   p50 ms |   p95 ms |   Max ms | Threshold                | Sonuç |
| ------------ | -------: | -------: | -------: | ------------------------ | ----- |
| PERF-SCN-001 |   153,64 |   239,59 |   239,59 | cold ≤ 2.000; warm ≤ 750 | PASS  |
| PERF-SCN-002 | 1.982,37 | 2.570,14 | 2.570,14 | p95 ≤ 8.000              | PASS  |
| PERF-SCN-003 | 3.965,25 | 4.200,68 | 4.200,68 | p95 ≤ 15.000             | PASS  |
| PERF-SCN-004 |     0,58 |     3,20 |     3,20 | p95 ≤ 300                | PASS  |
| PERF-SCN-005 |     0,42 |     1,38 |     1,38 | p95 ≤ 250                | PASS  |
| PERF-SCN-006 |     0,83 |     1,06 |     1,06 | p95 ≤ 300                | PASS  |

Scanner performance **6/6 PASS**, errors 0; duplicate result, progress, unauthorized access ve
idempotency invariant'ları korunmuştur.

### Alerts/Watchlists performance

| ID           |   p50 ms |   p95 ms |   Max ms | Threshold    | Sonuç |
| ------------ | -------: | -------: | -------: | ------------ | ----- |
| PERF-AWN-001 |     9,02 |    12,94 |    13,62 | p95 ≤ 250    | PASS  |
| PERF-AWN-002 | 1.892,19 | 2.057,08 | 2.057,08 | p95 ≤ 10.000 | PASS  |
| PERF-AWN-003 |     1,22 |     2,01 |     2,74 | p95 ≤ 100    | PASS  |
| PERF-AWN-004 |     2,31 |     5,49 |     6,63 | p95 ≤ 150    | PASS  |
| PERF-AWN-005 |    39,69 |    45,15 |    45,15 | p95 ≤ 750    | PASS  |

Alerts/Watchlists performance **5/5 PASS**, errors 0; ownership, IDOR, note XSS, duplicate
trigger/delivery ve watchlist market summary contract'ı korunmuştur.

### Portfolio/Risk performance

| ID            | p50 ms | p95 ms | Max ms | Threshold   | Sonuç |
| ------------- | -----: | -----: | -----: | ----------- | ----- |
| PERF-PORT-001 | 142,35 | 150,57 | 150,57 | p95 ≤ 5.000 | PASS  |
| PERF-PORT-002 | 108,44 | 122,03 | 122,03 | p95 ≤ 3.000 | PASS  |
| PERF-PORT-003 |  35,35 |  36,84 |  39,70 | p95 ≤ 1.500 | PASS  |
| PERF-PORT-004 |   5,05 |   6,85 |   7,33 | p95 ≤ 3.000 | PASS  |
| PERF-PORT-005 | 144,85 | 152,90 | 152,90 | p95 ≤ 8.000 | PASS  |
| PERF-PORT-006 |   5,90 |   7,14 |  11,66 | p95 ≤ 500   | PASS  |

Portfolio/Risk performance **6/6 PASS**, errors 0; financial/risk fixture, CSV security, positions
HTTP cursor, IDOR ve NaN/Infinity kapıları korunmuştur.

## 11. GO kararı

TASK-053–TASK-059 kabul kriterleri gerçek komutlarla doğrulanmıştır. Database/read-model,
overview cursor, chart contract, fundamentals revision/ratio, pattern no-look-ahead, cache
correctness, cross-user isolation, web accessibility ve altı mandatory performance threshold'u
PASS'tir. Scanner Runtime, Alerts/Watchlists ve Portfolio/Risk baseline'larında regresyon yoktur.

**Market Intelligence milestone kararı: GO.**
