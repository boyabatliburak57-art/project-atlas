# NO-GO — Indicator and Scanner Core Milestone Audit

**Görev:** TASK-021  
**Tarih:** 2026-07-13  
**Karar:** **NO-GO — TASK-022'ye geçilmemeli**  
**Ortam:** macOS arm64, Node.js 22.14.0

## 1. Yönetici özeti

TASK-012–TASK-020 kapsamındaki Indicator Engine ve Scanner Core davranışları gerçek testlerle
doğrulandı. Hedefli domain paketi 9 dosyada 80/80, Indicator Catalog API ve OpenAPI 2 dosyada
6/6, repository test kapısı toplam 121/121 test ile başarılıdır. Scanner AST güvenlik sınırları,
üç durumlu değerlendirme, cross semantiği, deterministik planner, complexity ve entitlement
kontrolleri geçmiştir.

Milestone buna rağmen **NO-GO**'dur. İki zorunlu repository kapısı başarısızdır:

1. `pnpm validate:adr`, iki ayrı kabul edilmiş belgenin `ADR-006` kimliğini taşıması nedeniyle
   başarısızdır.
2. `pnpm format:check`, dokuz Markdown dosyasında format farkı bulmuştur.

Bu iki failure giderilip tam kapılar yeniden çalıştırılmadan TASK-022 Scanner Runtime database
migration görevine geçilmemelidir.

| Sınıflandırma    | Sayı | Açıklama                                                                     |
| ---------------- | ---: | ---------------------------------------------------------------------------- |
| passed           |   28 | Core davranışları, testler, build, security ve toolchain kontrolleri         |
| failed           |    2 | ADR identifier validation ve repository formatting                           |
| not verifiable   |    0 | İstenen kontrollerin tamamı doğrudan çalıştırıldı                            |
| deviation        |    1 | TASK-012–TASK-015 kartlarında durum alanı bulunmuyor; davranışlar doğrulandı |
| critical failure |    2 | İki zorunlu quality gate başarısız                                           |

Foundation re-audit raporu `GO` durumundadır; ancak mevcut çalışma ağacındaki ADR ve format
regresyonları bu milestone için yeni ve engelleyici failure'lardır.

## 2. Toolchain ve araç sürümleri

| Araç       | Sürüm   | Doğrulama komutu                                    | Sonuç  |
| ---------- | ------- | --------------------------------------------------- | ------ |
| Node.js    | 22.14.0 | `node --version`                                    | passed |
| Corepack   | 0.31.0  | `corepack --version`                                | passed |
| pnpm       | 9.15.4  | `corepack pnpm --version`                           | passed |
| Turbo      | 2.10.4  | `pnpm exec turbo --version`                         | passed |
| Prettier   | 3.8.1   | `pnpm exec prettier --version`                      | passed |
| ESLint     | 9.39.1  | `pnpm exec eslint --version`                        | passed |
| TypeScript | 5.9.3   | `pnpm exec tsc --version`                           | passed |
| Vitest     | 4.1.10  | `pnpm --filter @atlas/domain exec vitest --version` | passed |
| Gitleaks   | 8.30.1  | `pnpm secret:scan:test`, `pnpm secret:scan`         | passed |

`pnpm version:check` Node 22.14.0 ve pnpm 9.15.4 hedeflerini kabul etti. Negatif toolchain
testleri 3/3 geçti; yanlış Node major ve tutarsız repository sürüm kaynakları reddedildi.

## 3. Indicator Engine doğrulamaları

| Kontrol                      | Sınıf  | Komut / test sayısı                                                                | Kanıt                                                                                                  |
| ---------------------------- | ------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Indicator domain contracts   | passed | Hedefli domain suite; contracts dosyasında 8/8 test                                | `packages/domain/src/indicators/contracts.ts`, `indicator-contracts.test.ts`                           |
| Input validation             | passed | Ordered/unique input kabulü; duplicate ve sırasız timestamp reddi                  | `packages/domain/src/indicators/validation.ts`, `indicator-contracts.test.ts`                          |
| Deterministic parameter hash | passed | Nested key sırasından bağımsız hash ve invalid value negatif testleri              | `packages/domain/src/indicators/parameter-hash.ts`, `indicator-contracts.test.ts`                      |
| Math primitives              | passed | 12/12 test                                                                         | `packages/domain/src/indicators/math/math-primitives.test.ts`                                          |
| Set A fixtures               | passed | 7/7 test; 10 definition için elle hesaplanmış static fixture                       | `packages/domain/src/indicators/fixtures/set-a/reference-fixtures.ts`, `core-indicators-set-a.test.ts` |
| Set B fixtures               | passed | 7/7 test; 10 definition için static hand/spreadsheet fixture                       | `packages/domain/src/indicators/fixtures/set-b/reference-fixtures.ts`, `core-indicators-set-b.test.ts` |
| Warm-up ve firstValidIndex   | passed | Set A/B fixture, seed, alignment ve insufficient input testleri                    | `definitions/helpers.ts`, Set A/B testleri, `math-primitives.test.ts`                                  |
| NaN/Infinity guard           | passed | Non-finite input/output, zero range/volume ve extreme finite testleri              | `validation.ts`, `math/arithmetic.ts`, contracts ve Set A/B testleri                                   |
| Registry duplicate kontrolü  | passed | Registry 4/4; duplicate code/version reddedildi                                    | `registry/indicator-registry.ts`, `indicator-registry.test.ts`                                         |
| Batch request deduplication  | passed | Batch executor 4/4; aynı hesap bir kez çalıştı, sıra korundu, cache hit doğrulandı | `execution/batch-executor.ts`, `batch-executor.test.ts`                                                |

Hedefli Indicator/Scanner domain komutu:

```text
pnpm --filter @atlas/domain exec vitest run \
  src/indicators/indicator-contracts.test.ts \
  src/indicators/math/math-primitives.test.ts \
  src/indicators/definitions/core-indicators-set-a.test.ts \
  src/indicators/definitions/core-indicators-set-b.test.ts \
  src/indicators/registry/indicator-registry.test.ts \
  src/indicators/execution/batch-executor.test.ts \
  src/scanner/scanner-ast-validation.test.ts \
  src/scanner/scanner-evaluator.test.ts \
  src/scanner/scanner-execution-planner.test.ts
```

Sonuç: **9/9 dosya, 80/80 test passed**.

## 4. Indicator Catalog API ve OpenAPI

| Kontrol                         | Sınıf  | Sonuç                                                              | Kanıt                                                             |
| ------------------------------- | ------ | ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Catalog list/detail contract    | passed | Filtre, search, code/version metadata ve safe error testleri geçti | `apps/api/src/indicators/indicator-catalog.integration.test.ts`   |
| Disabled definition görünürlüğü | passed | Disabled definition list/detail içinde yayınlanmadı                | Aynı integration test                                             |
| Controller/domain sınırı        | passed | API domain registry kullanıyor; indicator hesaplama endpoint'i yok | `indicator-catalog.controller.ts`, `indicator-catalog.service.ts` |
| OpenAPI                         | passed | Indicator catalog operation'ları OpenAPI dokümanında doğrulandı    | `apps/api/src/openapi/openapi.test.ts`                            |

Komut:

```text
pnpm --filter @atlas/api exec vitest run \
  src/indicators/indicator-catalog.integration.test.ts \
  src/openapi/openapi.test.ts
```

Sonuç: **2/2 dosya, 6/6 test passed**.

## 5. Scanner Core doğrulamaları

| Kontrol                             | Sınıf  | Sonuç                                                                                 | Kanıt                                                                 |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| AST schema güvenliği                | passed | Unknown field, executable-shaped veri, unsupported operator/version/field reddedildi  | `scanner-ast-validation.test.ts`                                      |
| Node count ve depth limitleri       | passed | Limit sınırları ve limit aşımı testli                                                 | `validation/scan-rule-validator.ts`, `scanner-ast-validation.test.ts` |
| Stable normalization                | passed | Semantik olarak aynı AST byte-identical normalize çıktı üretti                        | `normalization/normalize-scan-rule.ts`                                |
| Crosses above/below                 | passed | Yalnız transition bar matched; devam barı notMatched; previous eksikliği notEvaluable | `scanner-evaluator.test.ts`                                           |
| Üç durumlu truth table              | passed | AND ve OR için 3×3 tabloların tamamı testli                                           | `scanner-evaluator.test.ts`                                           |
| Node result tree                    | passed | Nested group/condition açıklama ağacı üretildi                                        | `evaluation/scan-rule-evaluator.ts`, evaluator testi                  |
| Planner determinism                 | passed | Semantik aynı AST aynı serialized planı üretti                                        | `scanner-execution-planner.test.ts`                                   |
| Indicator dedup ve data requirement | passed | Duplicate indicator birleşti; timeframe/warm-up/history toplandı                      | Planner testi                                                         |
| Complexity                          | passed | Auditable score, sync/async threshold ve hard limit testli                            | `planning/execution-planner.ts`, planner testi                        |
| Entitlement                         | passed | Bounded özet porta iletildi; violation ayrı domain hatası                             | `planning/contracts.ts`, planner testi                                |

Scanner güvenlik taramaları:

```text
rg <framework/database/queue import desenleri> packages/domain/src
rg <eval/new Function/child_process/node:vm/SQL desenleri> packages/domain/src/scanner
rg <test skip/only desenleri> apps packages --glob '*.{test,spec}.{ts,tsx,js,mjs}'
```

Sonuç: domain framework sınırı temiz, scanner içinde executable/SQL biçimli kod yok ve testlerde
skip/only bulunmadı.

## 6. Repository quality ve security gates

| Kontrol                         | Komut                                                                                | Sonuç      |         İş/test sayısı | Kanıt                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------ | ---------- | ---------------------: | ------------------------------------------------------ |
| Format                          | `pnpm format:check`                                                                  | **failed** |                9 dosya | Prettier 3.8.1 çıktısı                                 |
| Lint, cache dışı                | `pnpm exec turbo run lint --force`                                                   | passed     |     8/8 task, cached 0 | Workspace lint scriptleri                              |
| Typecheck, cache dışı           | `pnpm exec turbo run typecheck --force`                                              | passed     |     8/8 task, cached 0 | Workspace tsconfig dosyaları                           |
| Test, cache dışı                | `pnpm exec turbo run test --force`                                                   | passed     | 26 dosya, 121/121 test | Domain 80, DB 5, web 3, worker 20, API 13              |
| Build, cache dışı               | `NEXT_PUBLIC_API_URL=http://127.0.0.1:3001/api/v1 pnpm exec turbo run build --force` | passed     |     8/8 task, cached 0 | Turbo ve workspace build scriptleri                    |
| Toolchain                       | `pnpm version:check`                                                                 | passed     |            1 doğrulama | `.nvmrc`, `.node-version`, `.npmrc`, `package.json`    |
| Toolchain negatif test          | `pnpm test:version-check`                                                            | passed     |               3/3 test | `scripts/check-toolchain-versions.test.mjs`            |
| ADR validation                  | `pnpm validate:adr`                                                                  | **failed** |    Duplicate `ADR-006` | `architecture/ADR-006-*.md`, `ADR_INDEX.md`            |
| ADR validator test              | `pnpm test:adr-validator`                                                            | passed     |               3/3 test | Validator duplicate/mismatch fixture'larını reddediyor |
| Synthetic secret detection      | `pnpm secret:scan:test`                                                              | passed     |          1/1 detection | Finding içeriği redacted                               |
| Working tree ve Git secret scan | `pnpm secret:scan`                                                                   | passed     |   70 commit, 0 finding | Gitleaks 8.30.1; çalışma ağacı + Git geçmişi           |

Format failure bulunan dosyalar:

- `architecture/ADR_INDEX.md`
- `architecture/ARCH-001-System-Overview.md`
- `architecture/ARCH-004-Scanner-Engine.md`
- `docs/DOC-002-Product-Requirements.md`
- `docs/DOC-008-Indicator-Engine-Requirements.md`
- `docs/DOC-009-Scanner-Engine-Requirements.md`
- `README.md`
- `T3_CODE_START_HERE.md`
- `templates/TASK_TEMPLATE.md`

ADR identifier failure bulunan dosyalar:

- `architecture/ADR-008-Drizzle-PostgreSQL-Data-Access.md` (audit sırasında `ADR-006` kimliğindeydi)
- `architecture/ADR-006-Scan-Run-As-Resource.md`

`architecture/ADR_INDEX.md` benzersiz kimlik kuralını açıkça zorunlu tutmasına rağmen her iki belge
de kabul edilmiş `ADR-006` kimliğini taşımaktadır.

## 7. Sapmalar

| Kimlik | Sınıf     | Kritiklik    | Açıklama                                                                                                                                      | Karar etkisi                 |
| ------ | --------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| D-001  | deviation | kritik değil | TASK-012, TASK-013, TASK-014 ve TASK-015 kartlarında `Durum: Tamamlandı` alanı yoktur. Kod ve kabul davranışları gerçek testlerle doğrulandı. | Tek başına GO'yu engellemez. |

TASK-016–TASK-020 kartları `Tamamlandı` durumundadır. TASK kartı metadata eksikliği davranışsal
failure olarak sayılmamıştır.

## 8. Remediation maddeleri

### R-001 — Duplicate ADR-006 kimliğini atomik düzelt

**Öncelik:** Kritik, TASK-022 blocker.

1. İki ADR'nin oluşturulma ve kabul geçmişini, index otoritesini ve mevcut referanslarını incele.
2. Daha sonra oluşturulan veya index dışında kalan belgeye bir sonraki boş ADR kimliğini ver.
3. Dosya adı, H1, `architecture/ADR_INDEX.md`, `ATLAS_INDEX.md`, changelog ve bütün referansları
   atomik güncelle.
4. `pnpm validate:adr` ve `pnpm test:adr-validator` komutlarını yeniden çalıştır.

### R-002 — Formatting baseline'i geri yükle

**Öncelik:** Kritik, TASK-022 blocker.

1. Prettier'ın raporladığı dokuz Markdown dosyasını yalnız format açısından düzelt.
2. Source veya Markdown dosyalarını `.prettierignore` ile kapsam dışına çıkarma.
3. `pnpm format:check` komutunu yeniden çalıştır.

### R-003 — TASK-021 tam re-audit

R-001 ve R-002 tamamlandıktan sonra Node 22.14.0 altında hedefli core testleri, format, ADR,
secret scan, cache dışı lint/typecheck/test/build kapılarının tamamını yeniden çalıştır. GO için
`failed: 0`, kritik deviation `0`, fixture/scanner safety eksiksiz ve foundation prerequisite GO
olmalıdır.

## 9. Son karar

**NO-GO.** Indicator ve Scanner domain çekirdeğinin davranışsal testleri başarılı olsa da zorunlu
format ve ADR validation kapıları başarısızdır. **TASK-022'ye geçilmesi önerilmez ve bu audit
sonucuyla TASK-022 başlatılmamalıdır.** Önce R-001 ve R-002 uygulanmalı, ardından R-003 re-audit
GO sonucu üretmelidir.
