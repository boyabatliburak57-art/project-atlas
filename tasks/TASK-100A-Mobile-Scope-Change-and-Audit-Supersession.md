# TASK-100A — Mobile Scope Change and Audit Supersession

**Durum:** COMPLETED_WITH_VALIDATION_BLOCKER  
**Bağımlılıklar:** Mevcut TASK-100 raporu ve karar geçmişi

## Amaç

Atlas'ı mobile-first ürün olarak kayda geçirmek, eski TASK-100 kararını tarihsel kanıt olarak
korumak ve mobil görev kapılarını authoritative dokümantasyona bağlamak.

## Mevcut durum

TASK-100 repository/local kanıtlarla `GO_FOR_FINAL_STAGING_GATE` vermiştir. Bu karar denetim anında
geçerlidir; sonradan gelen mobil kapsamı içermez. Mobil uygulama yoktur.

## Kapsam

Gap analysis, mimari kararlar, TASK-100A–L/R belgeleri, bağımlılık grafiği, README/index/changelog
kaydı ve TASK-100 raporuna append-only supersession bildirimi.

## Kapsam dışı

Mobil kod, `apps/mobile`, dependency, migration, API/worker değişikliği, TASK-100L veya TASK-100R
çalıştırılması.

## Bağımlılıklar

TASK-100 tarihsel raporu silinmeden ve önceki final decision değiştirilmeden korunur.

## Mimari gereksinimler

Mobile ana müşteri yüzeyi; web masaüstü analiz/ileri iş akışı/admin; API/worker ortak platformdur.
Mevcut backend, database, worker, domain, security ve audit sınırları korunur.

## API gereksinimleri

Yok. Gelecek contract açıkları gap analysis içinde hedef göreve bağlanır.

## UI/UX gereksinimleri

Premium fintech, sakin/kurumsal ve veri odaklı yön kaydedilir. Chatbot, prompt alanı, AI avatar,
sparkle ve belirsiz AI tavsiyesi yasaktır.

## Güvenlik gereksinimleri

Mevcut NO-GO, external gate, IDOR ve secret-leak koşulları zayıflatılamaz. Planlama kanıtı production
veya staging kanıtı sayılamaz.

## Accessibility gereksinimleri

Mobil uygulama için VoiceOver/TalkBack, dynamic type, focus, contrast, non-color metrics ve cihaz
matrisi zorunlu kapı olarak kaydedilir.

## Unit testleri

Doküman lint/format, required-section ve link/path doğrulaması.

## Integration testleri

README, index, changelog, TASK-100 ve gap report durumlarının birbiriyle tutarlılığı.

## Mobile E2E testleri

Uygulanmaz; mobil kod yoktur.

## Visual regression testleri

Uygulanmaz; hedef screenshot kapsamı TASK-100K/L'ye kaydedilir.

## Kabul kriterleri

- TASK-100 raporu korunur ve supersession kaydı aynen eklenir.
- `Production Readiness: NO-GO`, `Staging Gate: DEFERRED_EXTERNAL_GATE`,
  `Production Launch: BLOCKED` görünürdür.
- Tüm görev belgeleri ve gap/parity audit şablonu vardır.
- Kod, dependency, migration ve API değişikliği yoktur.

## Yasak yöntemler

Eski kararı silmek/değiştirmek; TASK-100L/R'yi çalışmış göstermek; fake/provider fixture kanıtını
production kanıtı saymak; `apps/mobile` oluşturmak.

## Çıktı raporu

`reports/mobile/task-100a-mobile-scope-change-result.md`,
`reports/mobile/mobile-scope-change-baseline.md`,
`reports/mobile/mobile-transformation-risk-register.md` ve mevcut gap analysis.

## Ayrıntılı T3 Code uygulama prompt'u

```text
TASK-100A'yı uygula. Önce repository ve dirty worktree'yi incele. Mevcut TASK-100 raporunu
append-only tarihsel artefakt olarak koru; final decision metnini değiştirme. Mobile-first ürün
konumlandırmasını, supersession durumunu, görev sırasını ve gap analysis'i README, ATLAS_INDEX,
CHANGELOG ve ilgili raporlara ekle. Bu görevde apps/mobile oluşturma, dependency ekleme, migration,
API, worker veya uygulama kodu değiştirme. Format/link/tutarlılık kontrollerini çalıştır ve yalnız
belge değişikliklerini raporla. Production-ready veya staging PASS iddiası üretme.
```
