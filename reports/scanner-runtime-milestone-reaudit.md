# GO — Scanner Runtime Milestone Re-Audit

- **Görev:** TASK-030D
- **Re-audit tarihi:** 2026-07-15
- **Karar:** **GO**
- **Baseline commit SHA:** `6ff8dd16eefc09ce315b2092d562aba45bbf2518`
- **Ortam:** macOS arm64, Apple M1, Node.js 22.14.0, pnpm 9.15.4, PostgreSQL 17.10,
  Redis 7.4.9

> GO kararı denetlenen çalışma ağacı içindir. Çalışma ağacı baseline commit üzerinde
> `architecture/ADR_INDEX.md` düzeltmesini ve v0.5 entegrasyon değişikliklerini içerdiğinden SHA
> tek başına bu sonucu yeniden üretmez. Herhangi bir commit oluşturulmamıştır.

## 1. Karar özeti

İlk audit ve remediation paketindeki bütün açık bulgular kapanmıştır:

- **F-001 kapalı:** repository-wide formatting kapısı PASS.
- **D-001 kapalı:** deterministik gerçek worker/PostgreSQL/Redis baseline'ındaki altı senaryo ve
  bütün threshold'lar PASS.
- **D-002 kapalı:** Playwright custom AST request payload round-trip testi gerçek UI ve scanner
  API üzerinden PASS.
- **F-002 kapalı:** ADR-008 resmi indekse doğru başlık ve durumla eklenmiş, ADR doğrulaması sekiz
  dosyayla PASS olmuştur.

| Sınıflandırma           | Sayı | Açıklama                                                        |
| ----------------------- | ---: | --------------------------------------------------------------- |
| passed                  |   19 | Bütün zorunlu kalite alanları doğrulandı                        |
| failed                  |    0 | Açık başarısız kapı yok                                         |
| not verifiable          |    0 | Bütün zorunlu alanlar gerçek komutlarla doğrulandı              |
| deviation               |    1 | Retired pnpm audit endpoint'i için npm bulk advisory fallback'ı |
| critical deviation      |    0 | Kritik sapma yok                                                |
| security not-verifiable |    0 | IDOR, secret ve production dependency ağacı doğrulandı          |
| regression              |    0 | Runtime, integration ve E2E tabanlarında test kaybı yok         |

```text
Decision: GO
Failed gates: 0
Critical deviations: 0
Security not-verifiable: 0
Runtime regression: 0
Integration regression: 0
E2E regression: 0
Performance threshold failures: 0
```

## 2. Regresyon tabanı

İlk audit'in karşılaştırılabilir 206 test tabanı korunmuş ve 208'e yükselmiştir.

| Katman                         | İlk audit | Re-audit | Fark | Sonuç |
| ------------------------------ | --------: | -------: | ---: | ----- |
| Domain unit                    |       121 |      121 |    0 | PASS  |
| Database unit                  |         7 |        7 |    0 | PASS  |
| Worker unit                    |        23 |       24 |   +1 | PASS  |
| API unit/integration-in-memory |        26 |       26 |    0 | PASS  |
| Web unit                       |         3 |        3 |    0 | PASS  |
| Unit/runtime ara toplamı       |       180 |      181 |   +1 | PASS  |
| PostgreSQL/Redis integration   |        24 |       24 |    0 | PASS  |
| Mevcut Playwright smoke        |         2 |        2 |    0 | PASS  |
| Yeni AST round-trip E2E        |         0 |        1 |   +1 | PASS  |
| Karşılaştırılabilir toplam     |       206 |      208 |   +2 | PASS  |

Test sayısı düşmemiştir. Worker artışı TASK-030B percentile testi, E2E artışı TASK-030C AST
round-trip testidir.

## 3. Komut matrisi

| Kapı                        | Gerçek komut / yöntem                                       | Sonuç                     |
| --------------------------- | ----------------------------------------------------------- | ------------------------- |
| Toolchain                   | `pnpm version:check`                                        | PASS                      |
| Formatting                  | `pnpm format:check`                                         | PASS                      |
| ADR validation              | `pnpm validate:adr`                                         | 8 dosya PASS              |
| ADR validator self-test     | `pnpm test:adr-validator`                                   | 3/3 PASS                  |
| Version checker self-test   | `pnpm test:version-check`                                   | 3/3 PASS                  |
| Drizzle schema check        | `pnpm --filter @atlas/database db:check`                    | PASS                      |
| Lint                        | `pnpm lint`                                                 | 8/8 package PASS          |
| Typecheck                   | `pnpm typecheck`                                            | 8/8 package PASS          |
| Unit/runtime                | `pnpm test`                                                 | 181/181 PASS              |
| Database integration        | İzole PostgreSQL ile `@atlas/database test:integration`     | 10/10 PASS                |
| Worker PG/Redis integration | İzole PostgreSQL/Redis ile `@atlas/worker test:integration` | 14/14 PASS                |
| Playwright                  | `pnpm --filter @atlas/web test:e2e`                         | 3/3 PASS                  |
| Performance                 | `pnpm perf:scanner`                                         | 6/6 scenario PASS         |
| Synthetic secret detection  | `pnpm secret:scan:test`                                     | PASS                      |
| Repository/history secret   | `pnpm secret:scan`                                          | 109 commit, 0 finding     |
| Production dependency audit | Production graph + npm bulk advisory endpoint               | 209 paket adı, 0 advisory |
| Production build            | `NEXT_PUBLIC_API_URL=<local> pnpm build`                    | 8/8 package PASS          |
| Skip/only scan              | Test kaynaklarında `rg` skip/only pattern taraması          | 0 finding                 |
| Whitespace                  | `git diff --check`                                          | PASS                      |

Integration suite'leri izole `atlas_scanner_go_reaudit` compose projesinde PostgreSQL 17 ve
Redis 7 ile, `_test` son ekli ayrı veritabanında seri çalıştırılmış; container ve volume'lar
sonrasında kaldırılmıştır.

### Dependency audit araç sapması

Repository'nin sabit pnpm 9.15.4 istemcisindeki `pnpm audit --prod`, npm'in eski
`/-/npm/v1/security/audits` endpoint'ini kaldırması nedeniyle HTTP 410 üretmiştir. Bu sonuç bir
advisory değildir. Aynı kurulu production dependency grafiği `pnpm -r list --prod --depth
Infinity` ile çıkarılmış, 209 benzersiz harici paket adı ve sürümü npm'in önerdiği
`/-/npm/v1/security/advisories/bulk` endpoint'ine gönderilmiştir. Sonuç **0 known advisory** ve
exit code 0'dır. Güvenlik alanı doğrulanabilir kaldığı için sapma non-critical kaydedilmiştir.

## 4. Performance baseline ve threshold sonuçları

Kaynaklar: `reports/performance/scanner-runtime-baseline.json` ve
`reports/performance/scanner-runtime-baseline.md`. Fixture 600 BIST enstrümanı ve 70.900
persisted bar içerir; worker concurrency 2, batch size 100'dür.

| ID           | Senaryo           |   p50 ms |   p95 ms |   Max ms | Threshold                                              | Sonuç |
| ------------ | ----------------- | -------: | -------: | -------: | ------------------------------------------------------ | ----- |
| PERF-SCN-001 | Small synchronous |   127,21 |   218,73 |   218,73 | warm p95 ≤ 750; cold p95 ≤ 2.000; error = 0            | PASS  |
| PERF-SCN-002 | Full BIST         | 1.999,33 | 2.448,50 | 2.448,50 | queue-terminal p95 ≤ 8.000; duplicate/error = 0        | PASS  |
| PERF-SCN-003 | Medium complexity | 4.087,49 | 4.419,98 | 4.419,98 | p95 ≤ 15.000; crash = 0; deterministic; heap ≤ 128 MiB | PASS  |
| PERF-SCN-004 | Result pagination |     0,74 |     4,29 |     4,29 | p95 ≤ 300; duplicate/missing = 0                       | PASS  |
| PERF-SCN-005 | Progress polling  |     0,76 |     1,15 |     1,15 | p95 ≤ 250; unauthorized/terminal change = 0            | PASS  |
| PERF-SCN-006 | Idempotent replay |     1,27 |     8,33 |     8,33 | p95 ≤ 300; new run = 0; request hash stable            | PASS  |

Small cold p95 140,09 ms'dir. Bütün senaryolarda hata sayısı sıfırdır. Full BIST 600/600
enstrüman işlemiş/eşlemiş, duplicate result sıfır ve progress monotonicity %100 olmuştur. Medium
senaryoda 600 enstrüman işlenmiş, 10 `notEvaluable` ve 92,06 MiB heap growth ölçülmüştür.
Pagination duplicate/missing, polling unauthorized/terminal change ve replay new-run sayıları
sıfırdır.

## 5. AST round-trip ve runtime davranışları

Playwright Chromium sonucu **3/3 PASS**: iki mevcut preset/custom smoke testi ve ayrıca yeni AST
round-trip E2E. Yeni test gerçek UI ile active BIST universe ve root `AND` altında
`RSI(14, v1, 1d) LT 35` ile `EMA(20, v1, 1d) CROSSES_ABOVE EMA(50, v1, 1d)` kurmuştur.

Browser'ın gerçek validation/run POST istekleri gözlemlenmiş; rule version, universe, root,
nodeId politikası, operandlar ve operatorler doğrulanmıştır. Backend normalization sonucu
semantik eşdeğerdir; run resource `ruleVersion: 1`, `planVersion: 1` taşımış ve sonuç ekranı aynı
run ID'sini kullanmıştır. API validation bypass edilmemiştir.

| Kabul alanı         | Kanıt                                                          | Sonuç |
| ------------------- | -------------------------------------------------------------- | ----- |
| Duplicate run       | Domain idempotency + PostgreSQL concurrent repository testleri | PASS  |
| Duplicate result    | Database guard + worker retry integration + PERF-SCN-002       | PASS  |
| Retry               | Worker integration retry-without-duplicates                    | PASS  |
| Cancellation        | Domain/API/worker cancellation testleri                        | PASS  |
| Progress            | Monotonic/fallback/freeze + worker integration + PERF-SCN-005  | PASS  |
| IDOR                | Status/results/cancel owner-other-user HTTP testleri           | PASS  |
| Saved scan conflict | Stale expectedRevision → `SAVED_SCAN_CONFLICT`                 | PASS  |
| Preset revision     | Published catalog ve run source revision testleri              | PASS  |

## 6. Son karar

**GO.** Failed gate, critical deviation, security not-verifiable, test regresyonu veya
performance threshold ihlali yoktur. İlk audit'in F-001/D-001/D-002 bulguları ve önceki
re-audit'in F-002 ADR indeks bulgusu kapanmıştır. Scanner Runtime milestone, TASK-031 baseline'ı
oluşturmak için uygundur.
