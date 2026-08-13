# Project Atlas

Project Atlas mobile v1 supports iOS phones only. The required native profile is iPhone 17 on
iOS 26.5. Android phones and tablet experiences are planned for mobile v1.1 and are not part of
the mobile v1 production-support claim.

Project Atlas, Borsa İstanbul (BIST) paylarını teknik ve temel verilerle tarayan; hazır ve kullanıcı tanımlı taramalar, alarm, izleme listesi, portföy ve ileride backtest yetenekleri sunacak modüler bir web uygulamasıdır.

## İlk sürüm kapsamı

- BIST sembol evreni ve şirket ana verisi
- OHLCV piyasa verisi entegrasyonu
- Teknik indikatör motoru
- Özelleştirilebilir tarama motoru
- Hazır taramalar ve kategoriler
- Çoklu zaman dilimi
- Hisse detay ekranı
- Watchlist ve favoriler
- Alarm sistemi
- Temel finansal filtreler
- Portföy takibi
- Admin, paket ve yetki temeli

## Kapsam dışı

- Otomatik emir iletimi
- Aracı kurum hesabına bağlanma
- Yatırım danışmanlığı
- ABD piyasaları, kripto, VİOP ve Forex

## Okuma sırası

1. `ATLAS_INDEX.md`
2. `T3_CODE_START_HERE.md`
3. `SYSTEM_PROMPT.md`
4. `docs/` içindeki belgeler
5. `architecture/`, `database/` ve `api/` belgeleri
6. Uygulanacak `tasks/TASK-xxx.md`

**Sürüm:** 0.1.0-foundation
**Aşama:** Dokümantasyon ve temel proje hazırlığı

## v0.2 ile eklenenler

- Teknoloji yığını kararları
- Repository ve kod standartları
- Güvenlik ve gizlilik gereksinimleri
- Geliştirme ve release süreci
- Mimari karar kayıtları
- Market Data Engine mimarisi
- Market Data fiziksel veri tasarımı
- Instrument ve bar API taslağı
- TASK-004 ile TASK-010 arası uygulama görevleri

## v0.3 ile eklenenler

- Indicator Engine gereksinimleri ve mimarisi
- Scanner Engine gereksinimleri ve mimarisi
- İndikatör sürümleme ve fixture standardı
- Üç durumlu scanner değerlendirmesi
- Indicator/scanner veri modeli ve API taslağı
- TASK-011–TASK-020

## v0.3.1 geçiş kuralı

Foundation audit NO-GO sonucu nedeniyle Indicator Engine görevleri geçici olarak durdurulmuştur.

Önce TASK-011A ile TASK-011F uygulanır. Re-audit GO sonucu vermeden TASK-012 başlatılmaz.

## v0.4 ile eklenenler

- Scanner Runtime ve persistence
- Saved/preset scan revision modeli
- Scanner runtime API ve UX
- TASK-021–TASK-030

## v0.4.1 geçiş kuralı

TASK-021A, TASK-021B ve TASK-021C tamamlanıp re-audit GO sonucu vermeden TASK-022 başlatılmaz.

## v0.4.2 geçiş kuralı

Scanner Runtime milestone audit sonucu NO-GO'dur.

Açık bulgular:

- F-001: sekiz scanner dosyasında format farkı
- D-001: ölçülebilir performance baseline ve threshold eksikliği
- D-002: custom scan AST request round-trip E2E eksikliği

TASK-030A, TASK-030B, TASK-030C ve TASK-030D tamamlanıp re-audit GO vermeden sonraki pakete geçilmez.

## v0.5 ile eklenenler

- Alarm değerlendirme ve bildirim gereksinimleri
- Çoklu özel watchlist ve scanner universe desteği
- Notification Center ve kullanıcı tercihleri
- Alert evaluation ve notification delivery runtime mimarileri
- Alerts, watchlists ve notifications veri/API tasarımları
- TASK-031–TASK-040

## v0.5 geçiş kuralı

TASK-031, TASK-030D GO sonucuna bağlıdır. TASK-031 tamamlanmadan TASK-032 başlatılmaz.

TASK-040 Alerts and Watchlists milestone audit sonucu GO olmadan sonraki pakete geçilmez.

## v0.6.1 Portfolio/Risk Remediation

TASK-050 sonucu NO-GO:

- PERF-PORT-006 gerçek application/API cursor pagination yolu eksik
- Watchlist market summary p95, 750 ms eşiğini aşıyor

Görev sırası: TASK-050A → TASK-050B → TASK-050C.

TASK-050C GO olmadan sonraki pakete geçilmez.

## v0.7 Market Intelligence, Symbol Detail and Advanced Charting

Belgeler:

- DOC-025–DOC-029
- ARCH-010–ARCH-012
- Market Intelligence Decision Proposal
- DB-007
- API-007
- Market Intelligence Test/Performance/Chart guides

Görev sırası: TASK-051 → TASK-060.

TASK-060 GO olmadan sonraki pakete geçilmez.

## v0.8 Strategy Lab, Backtesting and Research Experiments

Belgeler:

- DOC-030–DOC-034 backtesting, strategy versioning, execution/cost/data integrity, research experiments ve UX gereksinimleri
- ARCH-013–ARCH-015 deterministic engine, worker/results ve experiment runtime mimarileri
- Backtesting Policies Decision Proposal
- DB-008 Strategies, Backtests and Experiments persistence tasarımı
- API-008 Strategies, Backtests and Experiments API sözleşmesi
- Backtest Data Integrity, Test Matrix ve Performance Baseline rehberleri

Görev sırası: TASK-061 → TASK-070.

TASK-062 sırasında sabit ADR numarası kullanılmaz; repository'deki mevcut ADR kayıtları taranarak
sonraki boş ve benzersiz kimlikler seçilir.

TASK-070 Strategy Lab milestone audit sonucu GO olmadan sonraki pakete geçilmez.

## v0.8.1 Strategy Lab Remediation

TASK-070 NO-GO bulguları:

- PERF-BT-001–006 benchmark runner eksik
- mandatory metrics ve turnover eksik
- experiment production worker wiring eksik
- full Playwright suite kararsız

Görev sırası: TASK-070A → TASK-070E.

TASK-070E GO olmadan sonraki pakete geçilmez.

## v0.9 Production Readiness, Security Hardening and Operations

Belgeler:

- DOC-036–DOC-040 production readiness, security hardening, observability/SLO, backup/DR ve operational control gereksinimleri
- ARCH-016–ARCH-018 production deployment, observability/incident ve feature flag runtime mimarileri
- Production Readiness Policies karar önerisi
- DB-009 operations, audit, feature flags, releases, incidents ve recovery persistence tasarımı
- API-009 güvenli health ve admin operations API sözleşmesi
- Production Security Test Matrix, Load/Chaos/Resilience Baseline ve Production Release Runbook rehberleri

Görev sırası: TASK-071 → TASK-080.

TASK-072 sırasında sabit ADR numarası kullanılmaz; repository'deki mevcut ADR kayıtları taranarak
sonraki boş ve benzersiz kimlikler seçilir.

Mevcut milestone performans threshold'ları ve baseline fixture'ları korunur. Gerçek production
deploy kullanıcı onayı olmadan başlatılmaz; yalnız deployment manifestleri, IaC, CI/CD workflow'ları
ve kullanıcı onaylı deployment süreçleri hazırlanır.

TASK-080 Production Readiness milestone audit sonucu GO olmadan v1.0 release candidate oluşturulmaz.

## v0.10 Product Completion and Pre-Staging Release Candidate

Durum:

```text
Production Readiness: NO-GO
Staging Gate: DEFERRED_EXTERNAL_GATE
Product Development: CONTINUE
```

v0.10, gerçek staging erişimine bağlı Production Readiness kapısını erteleyerek staging dışı ürün
tamamlama çalışmalarını sürdürür. Bu paket production launch yapmaz, TASK-080 kararını GO olarak
değiştirmez ve yerel testleri, local container/load sonuçlarını veya eski DAST artifact'lerini staging
kanıtı olarak kabul etmez.

Belgeler:

- `README-v0.10.md`
- `docs/DOC-042-Staging-Gate-Deferral-Policy.md`
- `docs/DOC-043-V1-Product-Scope-Freeze.md`
- `docs/DOC-044-Onboarding-Preferences-and-User-Settings.md`
- `docs/DOC-045-Navigation-Search-and-Activity-Center.md`
- `docs/DOC-046-Reports-Exports-and-Data-Transparency.md`
- `docs/DOC-047-Accessibility-Localization-and-Responsive-Polish.md`
- `architecture/ARCH-019-Pre-Staging-Product-Completion.md`
- `database/DB-010-Preferences-Activity-and-Reports.md`
- `api/API-010-Preferences-Search-Activity-Reports.md`

Görev sırası:

1. TASK-081
2. TASK-082
3. TASK-083
4. TASK-084
5. TASK-085
6. TASK-086
7. TASK-087
8. TASK-088
9. TASK-089
10. TASK-090

TASK-090 yalnız `GO_FOR_STAGING_VALIDATION` veya `NO-GO_FOR_STAGING_VALIDATION` kararı verebilir;
production GO veremez. Gerçek staging erişimi sağlandığında ertelenen TASK-080S/TASK-080P kapıları
ayrıca yeniden açılır.

## v0.11 Data Governance, Provider Integration and Launch Readiness

Durum:

```text
Production Readiness: NO-GO
Staging Gate: DEFERRED_EXTERNAL_GATE
Product Development: CONTINUE
```

v0.11, staging kapıları ertelenmişken tamamlanabilen provider entegrasyonu, veri yönetişimi,
bildirim teslimatı, hukuki onay izleri, yardım içeriği, destek ve hesap yaşam döngüsü kapsamını
tamamlar. Bu paket production launch veya staging validation yerine geçmez ve TASK-080 Production
Readiness kararını değiştirmez.

Belgeler:

- `README-v0.11.md`
- `docs/DOC-048-Provider-Integration-and-Data-Governance.md`
- `docs/DOC-049-Notification-Delivery-and-User-Communications.md`
- `docs/DOC-050-Launch-Content-Legal-Review-and-Support.md`
- `architecture/ARCH-020-Provider-and-Data-Operations-Runtime.md`
- `database/DB-011-Provider-Lineage-Consent-and-Support.md`
- `api/API-011-Data-Operations-Consent-and-Support.md`
- `guides/PROVIDER_ACCEPTANCE_MATRIX.md`

Görev sırası:

1. TASK-091
2. TASK-092
3. TASK-093
4. TASK-094
5. TASK-095
6. TASK-096
7. TASK-097
8. TASK-098
9. TASK-099
10. TASK-100

Gerçek provider credential'ı, yetkili erişim ve production sözleşmesi doğrulanmadan fake, fixture,
stub, replay-only veya sandbox adapter'ları gerçek production entegrasyonu olarak sınıflandırılmaz.
TASK-100 yalnız `GO_FOR_FINAL_STAGING_GATE` veya `NO-GO_FOR_FINAL_STAGING_GATE` kararı verebilir;
production GO veremez. Gerçek staging kanıtları TASK-080S/TASK-080P kapsamında ayrıca
tamamlanmalıdır.

## Mobile-First Product Transformation

Project Atlas is being transformed into a mobile-first financial analytics platform. The mobile
application will become the primary customer experience, while the existing web application will
remain available for advanced desktop analytics and administration.

Project Atlas; BIST odaklı piyasa analizi, scanner, alarm, portföy/risk yönetimi, finansal veri
analizi ve strateji backtesting özellikleri sunan modern ve profesyonel bir mobil finans
uygulamasıdır. Mobil yüzey günlük market takibi, scanner, alerts, portfolio/risk, Strategy Lab,
reports, help ve settings sağlar. Web silinmez; büyük tablo/grafik deneyimleri, ileri strateji
düzenleme, operasyon ve admin işlemleri için korunur. API ve workers tüm istemcilerin ortak backend
platformudur.

```text
Product Strategy: MOBILE_FIRST
Primary Customer Surface: MOBILE_APPLICATION
Desktop Surface: ADVANCED_ANALYTICS_AND_ADMIN
Backend Platform: SHARED_API_AND_WORKERS
Status: SUPERSEDED_BY_MOBILE_SCOPE_CHANGE
Reason: Mobile application became the primary product surface after the audit.
Production Readiness: NO-GO
Staging Gate: DEFERRED_EXTERNAL_GATE
Production Launch: BLOCKED
```

The previous TASK-100 audit remains a valid historical web/API/worker baseline but is superseded for
final launch readiness until mobile feature parity and mobile re-audit are completed. Mobil
uygulama kodu bu kapsam kayıt görevinde başlatılmamıştır. Zorunlu okuma:

- `reports/mobile/mobile-transformation-gap-analysis.md`
- `reports/mobile/mobile-scope-change-baseline.md`
- `reports/mobile/mobile-transformation-risk-register.md`
- `reports/mobile/task-100a-mobile-scope-change-result.md`
- `reports/mobile/mobile-monorepo-architecture.md`
- `reports/mobile/mobile-dependency-and-compatibility-matrix.md`
- `reports/mobile/task-100b-mobile-architecture-result.md`
- `reports/mobile/mobile-feature-parity-audit.md`
- `tasks/TASK-100A-Mobile-Scope-Change-and-Audit-Supersession.md`
- `tasks/TASK-100B-Mobile-Architecture-and-Monorepo-Setup.md`
- `tasks/TASK-100C-Mobile-Design-System-and-Navigation.md`
- `tasks/TASK-100D-Mobile-Authentication-Onboarding-and-Preferences.md`
- `tasks/TASK-100E-Mobile-Market-Overview-Search-and-Symbol-Detail.md`
- `tasks/TASK-100F-Mobile-Scanner-Watchlists-Alerts-and-Push.md`
- `tasks/TASK-100G-Mobile-Portfolio-and-Risk.md`
- `tasks/TASK-100H-Mobile-Strategy-Lab-Backtests-and-Experiments.md`
- `tasks/TASK-100I-Mobile-Reports-Help-Support-and-Settings.md`
- `tasks/TASK-100J-Mobile-Native-Services-Security-and-Offline.md`
- `tasks/TASK-100K-Mobile-Accessibility-Performance-and-QA.md`
- `tasks/TASK-100L-Mobile-Feature-Parity-Audit.md`
- `tasks/TASK-100R-Non-Staging-Launch-Completeness-Reaudit.md`

Uygulama sırası ve kapılar:

```text
TASK-100A -> TASK-100B -> TASK-100C -> TASK-100D -> TASK-100E
-> TASK-100F -> TASK-100G -> TASK-100H -> TASK-100I -> TASK-100J
-> TASK-100K -> TASK-100L [GO_FOR_TASK_100_REAUDIT] -> TASK-100R
```

TASK-100L GO olmadan TASK-100R çalıştırılmaz. TASK-100R yalnız
`GO_FOR_FINAL_STAGING_GATE` veya `NO-GO_FOR_FINAL_STAGING_GATE` verebilir; production readiness
`NO-GO`, staging gate `DEFERRED_EXTERNAL_GATE` ve production launch `BLOCKED` kalır.

The sequence above is retained as the existing mobile baseline. As of 2026-08-12, TASK-100R is
`SUPERSEDED_BY_BIST_INTELLIGENCE_EXPANSION`; its preserved artefacts are not authoritative for the
expanded product.

## BIST Investment Research & Market Intelligence Expansion

Atlas is a BIST-focused investment research and market-intelligence platform combining market
data, company intelligence, institutional flows, event intelligence, screening, portfolio
analytics and strategy research in one connected mobile experience. Atlas is not a broker, does
not execute trades, does not provide investment advice and does not create orders for users.

The expansion adds KAP and corporate events, institutional flow and settlement, BIST measures,
calendars, company/peer/ownership intelligence, Radar 2.0, fund and VIOP analytics, depth and
advanced chart workspaces, plus the explainable Atlas intelligence layer. Existing mobile v1
features are preserved.

Authoritative documents:

- `docs/product/ATLAS_BIST_INTELLIGENCE_PRODUCT_SCOPE.md`
- `docs/product/ATLAS_INFORMATION_ARCHITECTURE_V2.md`
- `docs/product/ATLAS_INTELLIGENCE_DOMAIN_MAP.md`
- `docs/product/ATLAS_PROVIDER_CAPABILITY_EXPANSION.md`
- `reports/mobile/task-110a-existing-vs-new-capability-matrix.md`
- `reports/mobile/task-110a-audit-supersession.md`

Primary navigation is `Home`, `Markets`, `Radar`, `Portfolio`, `Research`; Search and Smart Inbox
are global actions, and Settings/Account is profile-level navigation. Maximum primary tabs is five.

```text
TASK-110A -> TASK-110B -> TASK-110C -> TASK-110D -> TASK-110E -> TASK-110F
-> TASK-110G -> TASK-110H -> TASK-110I -> TASK-110J -> TASK-110K -> TASK-110L
-> TASK-110M -> TASK-110N -> TASK-110O -> TASK-110P -> TASK-110Q -> TASK-110R
-> TASK-110S

Production Readiness: NO-GO
Staging Gate: DEFERRED_EXTERNAL_GATE
Production Launch: BLOCKED
```
