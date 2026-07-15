# Scanner Runtime GO Baseline

- **Durum:** GO
- **Görev:** TASK-031
- **Baseline tarihi:** 2026-07-15
- **Baseline commit SHA:** `6ff8dd16eefc09ce315b2092d562aba45bbf2518`
- **Kaynak re-audit:** `reports/scanner-runtime-milestone-reaudit.md`

> Bu baseline denetlenen çalışma ağacını sabitler. Çalışma ağacı baseline commit üzerinde
> ADR-008 indeks düzeltmesini ve v0.5 entegrasyon değişikliklerini içerir; commit oluşturulmamıştır.
> Bu nedenle SHA, çalışma ağacı değişiklikleri olmadan tek başına GO snapshot'ı değildir.

## Test tabanı

| Katman                              | Sonuç        |
| ----------------------------------- | ------------ |
| Unit/runtime                        | 181/181 PASS |
| PostgreSQL/Redis integration        | 24/24 PASS   |
| Mevcut Playwright preset/custom E2E | 2/2 PASS     |
| Yeni AST request round-trip E2E     | 1/1 PASS     |
| Toplam Playwright                   | 3/3 PASS     |
| Karşılaştırılabilir toplam          | 208 PASS     |

İlk audit'in 206 testlik tabanı korunmuştur. Yeni AST testi gerçek UI'nın gönderdiği scanner run
request'ini network katmanında doğrulamış; backend validation/normalization semantik eşdeğerliği,
`ruleVersion: 1`, `planVersion: 1` ve sonuç ekranındaki aynı run ID'si PASS olmuştur.

## Performance baseline

- **Fixture:** 600 BIST enstrümanı, 70.900 persisted bar
- **Worker concurrency:** 2
- **Batch size:** 100
- **Rapor üretim zamanı:** 2026-07-15T17:20:23.340Z

| ID           | Senaryo           |   p50 ms |   p95 ms |   Max ms | Threshold                                              | Sonuç |
| ------------ | ----------------- | -------: | -------: | -------: | ------------------------------------------------------ | ----- |
| PERF-SCN-001 | Small synchronous |   127,21 |   218,73 |   218,73 | warm p95 ≤ 750; cold p95 ≤ 2.000; error = 0            | PASS  |
| PERF-SCN-002 | Full BIST         | 1.999,33 | 2.448,50 | 2.448,50 | queue-terminal p95 ≤ 8.000; duplicate/error = 0        | PASS  |
| PERF-SCN-003 | Medium complexity | 4.087,49 | 4.419,98 | 4.419,98 | p95 ≤ 15.000; crash = 0; deterministic; heap ≤ 128 MiB | PASS  |
| PERF-SCN-004 | Result pagination |     0,74 |     4,29 |     4,29 | p95 ≤ 300; duplicate/missing = 0                       | PASS  |
| PERF-SCN-005 | Progress polling  |     0,76 |     1,15 |     1,15 | p95 ≤ 250; unauthorized/terminal change = 0            | PASS  |
| PERF-SCN-006 | Idempotent replay |     1,27 |     8,33 |     8,33 | p95 ≤ 300; new run = 0; request hash stable            | PASS  |

Bütün performance senaryoları ve kabul threshold'ları PASS; hata sayıları sıfırdır. Makine ve
fixture ayrıntılarının kanonik kaynakları
`reports/performance/scanner-runtime-baseline.json` ve
`reports/performance/scanner-runtime-baseline.md` dosyalarıdır.

## Quality gate snapshot

| Kapı                        | Baseline sonucu                            |
| --------------------------- | ------------------------------------------ |
| Formatting                  | `pnpm format:check` PASS                   |
| ADR validation              | 8 ADR dosyası PASS                         |
| Secret scan                 | Synthetic PASS; 109 commit; 0 finding      |
| Production dependency audit | 209 production paket adı; 0 known advisory |
| Production build            | 8/8 package PASS                           |

Sabit pnpm 9.15.4 istemcisinin eski npm audit endpoint'i HTTP 410 döndürdüğü için production
dependency grafiği npm bulk advisory endpoint'iyle salt-okunur denetlenmiştir. Bu araç sapması
non-critical'dır; security not-verifiable değildir. Ayrıntı ve diğer kapılar re-audit raporunda
kayıtlıdır.

## Baseline kararı

Scanner Runtime milestone **GO** baseline'ı; 181 runtime, 24 PostgreSQL/Redis integration, üç
Playwright testi, altı performance threshold'u, format, ADR, secret, dependency ve production
build kapılarıyla sabitlenmiştir. Bu görev uygulama kodu davranışını değiştirmez.
