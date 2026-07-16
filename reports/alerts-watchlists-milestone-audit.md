# GO — Alerts, Watchlists and Notification Runtime Milestone Audit

- **Görev:** TASK-040
- **Kapsam:** TASK-032–TASK-039
- **Audit tarihi:** 2026-07-16
- **Audit commit SHA:** `ab5c29e8f8cd6b193fee6da50ae0aa2a20493044`
- **Karar:** **GO**

| Karar ölçütü                | Sonuç |
| --------------------------- | ----: |
| Failed                      |     0 |
| Critical deviation          |     0 |
| Non-critical tool deviation |     1 |
| Duplicate defect            |     0 |
| IDOR                        |  PASS |
| Note XSS                    |  PASS |
| Playwright E2E              |  PASS |
| Performance                 |  PASS |

TASK-040 GO koşulu olan `failed=0`, `critical deviation=0`, `duplicate=0` ve
IDOR/XSS/E2E/performance PASS sağlanmıştır. Performance ölçümleri internet veya gerçek piyasa veri
sağlayıcısı kullanmayan deterministik fixture'larla yapılmıştır.

## Kabul kriterleri

| Alan                              | Doğrulama                                                                                                              | Kanıt                                                                             | Sonuç |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----- |
| TASK-032 migrations               | 12 yeni tablo; clean migration; FK, unique, ownership index ve rollback/reapply                                        | Database integration 13/13; migration/schema unit 9/9                             | PASS  |
| Evaluation deduplication          | Aynı alert revision, event ve cutoff kimliği ikinci evaluation oluşturmaz                                              | DB unique guard, domain same-event ve worker replay testleri                      | PASS  |
| Trigger deduplication             | Revision/source/instrument dedup anahtarı; duplicate event tek trigger                                                 | DB unique guard; worker duplicate event integration testi                         | PASS  |
| Notification delivery idempotency | Notification, delivery ve outbox tekrarları tekilleştirilir                                                            | DB delivery/outbox guard; worker duplicate prevention ve retry testleri           | PASS  |
| Watchlist ownership ve IDOR       | CRUD, item, universe ve market-summary owner-scoped                                                                    | Domain ownership testi; API foreign-user 403 testleri                             | PASS  |
| Note XSS                          | Çalıştırılabilir markup reddedilir                                                                                     | Domain note validation ve API note XSS testi                                      | PASS  |
| Duplicate instrument              | Service guard ve repository race/unique constraint                                                                     | Domain, API ve PostgreSQL integration testleri                                    | PASS  |
| Reorder/tags/quota/delete         | Exact-set reorder, tag normalization, quota port, soft delete/restore                                                  | Watchlist domain 8/8                                                              | PASS  |
| Watchlist universe snapshot       | Sıralı snapshot sonradan yapılan liste değişikliklerinden etkilenmez                                                   | `creates ordered snapshots that remain immutable after list changes`              | PASS  |
| Market summary                    | Cursor, cutoff, fresh/stale meta ve deleted-list policy                                                                | Watchlist API integration 5/5                                                     | PASS  |
| Alert immutable revision          | Update yeni revision ekler; eski revision değişmez; stale revision conflict                                            | Domain revision testleri, DB immutability trigger'ı ve API optimistic concurrency | PASS  |
| Lifecycle/repeat policies         | Pause/resume/invalidation/delete; once, oncePerClosedBar ve oncePerDay                                                 | Alert domain 15/15                                                                | PASS  |
| afterReset                        | Armed → disarmed → matched reset → rearmed geçişleri                                                                   | Domain state-machine ve PostgreSQL worker integration testi                       | PASS  |
| everyNewMatch                     | Yalnız sete yeni giren semboller tetiklenir; exited/unchanged deterministik                                            | Domain set comparison ve worker scan-completion testi                             | PASS  |
| notEvaluable                      | Evaluation nedeni saklanır, trigger üretilmez                                                                          | Worker PostgreSQL integration testi                                               | PASS  |
| Worker retry ve catch-up          | Geçici hata retry sonrası bir kez commit; durmuş worker scan event'ini yakalar                                         | Alert evaluation worker integration 8/8                                           | PASS  |
| Quiet hours                       | Kullanıcı IANA timezone'ında gece aşan pencere; e-mail outbox defer                                                    | Notification unit 4/4 ve integration 6/6                                          | PASS  |
| In-app/unread/read                | In-app write, unread count, read/unread ve user-scoped mark-all-read                                                   | Worker integration ve Alerts/Notifications API integration 6/6                    | PASS  |
| E-mail sınırı                     | Contract ve fake adapter; disabled suppression; temporary/permanent taxonomy                                           | Notification runtime testleri; production provider yok                            | PASS  |
| Alert/notification API            | CRUD, revision/history, pause/resume, dry-run no-delivery, preferences/timezone                                        | API integration 37/37 toplamı içinde                                              | PASS  |
| OpenAPI                           | Tüm alert/watchlist/notification operation'ları ve önemli parametre/şemalar mevcut                                     | `apps/api/src/openapi/openapi.test.ts`                                            | PASS  |
| Web deneyimi                      | Watchlist oluştur/item ekle, price alert, fixture trigger, unread/read, saved-scan newMatch, pause/resume, preferences | Playwright portfolio 2/2                                                          | PASS  |

Portfolio Playwright akışı ağ katmanında deterministik route fixture'ı kullanır. API ve runtime
davranışları bunun dışında API unit/integration ve gerçek PostgreSQL/Redis worker integration
paketlerinde doğrulanmıştır. Public sharing, web push ve production e-mail provider kapsam dışı
kalmıştır.

## Test tabanı

### Unit ve runtime

`pnpm test` sonucu **223/223 PASS**:

| Paket             | Test |
| ----------------- | ---: |
| `@atlas/domain`   |  144 |
| `@atlas/database` |    9 |
| `@atlas/worker`   |   30 |
| `@atlas/api`      |   37 |
| `@atlas/web`      |    3 |

### PostgreSQL ve Redis integration

İzole Docker Compose projesinde test PostgreSQL ve Redis kullanılarak:

| Paket                              |      Test |
| ---------------------------------- | --------: |
| `@atlas/database test:integration` |     13/13 |
| `@atlas/worker test:integration`   |     28/28 |
| **Toplam**                         | **41/41** |

Database paketi clean migration, ownership/FK/unique constraint, revision immutability ve
evaluation/trigger/delivery/outbox deduplication'ı gerçek PostgreSQL'de doğruladı. Worker paketi
Alert Evaluation Worker, BullMQ/Redis progress/runtime ve Notification Delivery Runtime yollarını
gerçek PostgreSQL/Redis üzerinde doğruladı.

### Playwright

`pnpm --filter @atlas/web test:e2e` sonucu **5/5 PASS**:

- Scanner preset smoke: PASS
- Scanner custom smoke: PASS
- Scanner AST request round-trip: PASS
- Watchlist/alert/notification lifecycle: PASS
- Notification preferences, timezone ve quiet hours: PASS

Test taramasında `skip`, `only`, `xit`, `xtest` veya `xdescribe` bulunmadı.

## Alerts ve Watchlists performance baseline

Eşikler ilk başarılı ölçümden önce
`performance/thresholds/alerts-watchlists.json` içinde sabitlendi; hata ayıklama sırasında
değiştirilmedi. Runner gerçek repository sorgularını ve test PostgreSQL altyapısını kullanır,
threshold ihlalinde non-zero exit üretir. Ölçümlerin kanonik JSON ve Markdown çıktıları
`reports/performance/alerts-watchlists-baseline.json` ve
`reports/performance/alerts-watchlists-baseline.md` dosyalarındadır.

| ID           | Senaryo                              | Fixture / tekrar                             |   p50 ms |   p95 ms |   Max ms | Hata | Threshold                           | Sonuç |
| ------------ | ------------------------------------ | -------------------------------------------- | -------: | -------: | -------: | ---: | ----------------------------------- | ----- |
| PERF-AWN-001 | 1000 aktif alarm candidate filtering | 1 event × 1000 alert; 3 warm-up + 10 ölçüm   |     9,66 |    14,13 |    66,76 |    0 | p95 ≤ 250 ms; 1000 candidate        | PASS  |
| PERF-AWN-002 | 500 alarm evaluation batch           | 500 candidate × 3 batch                      | 2.176,39 | 2.873,55 | 2.873,55 |    0 | p95 ≤ 10.000 ms; duplicate = 0      | PASS  |
| PERF-AWN-003 | Notification unread count            | 10.000 notification; 3 warm-up + 30 ölçüm    |     0,96 |     2,44 |     2,70 |    0 | p95 ≤ 100 ms; doğru count           | PASS  |
| PERF-AWN-004 | Notification pagination              | 10.000 row; page 100                         |     2,01 |     3,07 |     5,08 |    0 | p95 ≤ 150 ms; missing/duplicate = 0 | PASS  |
| PERF-AWN-005 | Watchlist market summary             | 500 instrument × 2 bar; 3 warm-up + 10 ölçüm |   399,13 |   636,27 |   636,27 |    0 | p95 ≤ 750 ms; 500 row               | PASS  |

Fixture özeti: 1000 aktif alarm, 500 evaluation batch, 10.000 notification ve 500 watchlist
instrument. Dış provider yoktur. Bütün senaryoların error ve duplicate sayıları sıfırdır.

## Scanner Runtime baseline regresyonu

Scanner GO baseline'ı `reports/scanner-runtime-go-baseline.md` ile karşılaştırıldı ve gerçek
`pnpm perf:scanner` komutu yeniden çalıştırıldı.

| Kapı                         | GO baseline | Re-audit | Sonuç |
| ---------------------------- | ----------: | -------: | ----- |
| Unit/runtime                 |         181 |      223 | PASS  |
| PostgreSQL/Redis integration |          24 |       41 | PASS  |
| Playwright toplam            |           3 |        5 | PASS  |
| AST request round-trip       |        PASS |     PASS | PASS  |

| Scanner senaryosu |   p50 ms |   p95 ms |   Max ms | Threshold                                   | Sonuç |
| ----------------- | -------: | -------: | -------: | ------------------------------------------- | ----- |
| Small synchronous |    98,77 |   110,11 |   110,11 | warm p95 ≤ 750; cold p95 ≤ 2.000            | PASS  |
| Full BIST         | 1.975,53 | 2.319,26 | 2.319,26 | p95 ≤ 8.000; duplicate/error = 0            | PASS  |
| Medium complexity | 3.409,13 | 3.954,08 | 3.954,08 | p95 ≤ 15.000; heap ≤ 128 MiB                | PASS  |
| Result pagination |     0,61 |     2,37 |     2,37 | p95 ≤ 300; duplicate/missing = 0            | PASS  |
| Progress polling  |     0,51 |     1,71 |     1,71 | p95 ≤ 250; unauthorized/terminal change = 0 | PASS  |
| Idempotent replay |     0,86 |     1,21 |     1,21 | p95 ≤ 300; new run = 0                      | PASS  |

Altı scanner threshold'u PASS, error sayıları sıfırdır. Full BIST fixture 600 instrument ve 70.900
persisted bar; worker concurrency 2 ve batch size 100 olarak korunmuştur. Runtime, integration veya
Playwright test tabanında düşüş yoktur.

## Repository quality ve security kapıları

| Komut / kapı                             | Sonuç                                         |
| ---------------------------------------- | --------------------------------------------- |
| `pnpm format:check`                      | PASS                                          |
| `git diff --check`                       | PASS                                          |
| `pnpm validate:adr`                      | PASS — 8 ADR                                  |
| `pnpm test:adr-validator`                | PASS — 3/3                                    |
| `pnpm version:check` + validator         | PASS — Node 22.14.0, pnpm 9.15.4              |
| `pnpm --filter @atlas/database db:check` | PASS                                          |
| `pnpm lint`                              | PASS — 8/8 package                            |
| `pnpm typecheck`                         | PASS — 8/8 package                            |
| `pnpm test`                              | PASS — 223/223                                |
| PostgreSQL/Redis integration             | PASS — 41/41                                  |
| Playwright                               | PASS — 5/5                                    |
| `pnpm secret:scan:test`                  | PASS                                          |
| `pnpm secret:scan`                       | PASS — 123 commit, 0 leak                     |
| Production dependency audit              | PASS — 208 production package adı, 0 advisory |
| `NEXT_PUBLIC_API_URL=... pnpm build`     | PASS — 8/8 package                            |
| skip/only scan                           | PASS — 0 marker                               |

### Dependency audit tool sapması

Repository'nin sabit pnpm 9.15.4 istemcisindeki `pnpm audit --prod --audit-level high`, npm'in
emekliye ayırdığı `/-/npm/v1/security/audits` endpoint'inden HTTP 410 döndürdü. Önceki Scanner GO
baseline'ında belgelenen yöntem korunarak 208 production package adı npm'in
`/-/npm/v1/security/advisories/bulk` endpoint'ine salt-okunur gönderildi: **0 advisory, 0
high/critical**. Bu nedenle sapma non-critical ve güvenlik kapısı doğrulanabilir kabul edilmiştir.

## Sonuç

TASK-032–TASK-039 kabul kriterleri, beş yeni performance threshold'u ve Scanner Runtime regresyon
kapıları gerçek komutlarla PASS olmuştur. Açık failure, critical deviation, duplicate defect,
IDOR veya XSS bulgusu yoktur. Alerts, Watchlists and Notification Runtime milestone kararı
**GO**'dur.
