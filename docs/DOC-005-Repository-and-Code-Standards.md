# DOC-005 — Repository and Code Standards

**Sürüm:** 1.0  
**Durum:** Onay için hazır

## 1. Repository yapısı

```text
project-atlas/
├── apps/
│   ├── web/
│   ├── api/
│   └── worker/
├── packages/
│   ├── config/
│   ├── database/
│   ├── domain/
│   ├── types/
│   ├── validation/
│   ├── observability/
│   └── testing/
├── docs/
├── architecture/
├── database/
├── api/
├── tasks/
├── guides/
├── templates/
├── infrastructure/
├── scripts/
└── .github/
```

## 2. Dosya ve isimlendirme

- Dosya isimleri: `kebab-case`
- TypeScript sınıfları: `PascalCase`
- Fonksiyon ve değişkenler: `camelCase`
- Sabitler: yalnızca gerçekten global sabitlerde `UPPER_SNAKE_CASE`
- Database tablo ve kolonları: `snake_case`
- API JSON alanları: `camelCase`
- Environment değişkenleri: `UPPER_SNAKE_CASE`
- Domain event isimleri: geçmiş zaman, örneğin `ScanCompleted`

## 3. TypeScript

- `strict: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`
- `noImplicitOverride: true`
- `useUnknownInCatchVariables: true`
- `any` yalnızca yorumla gerekçelendirilmiş geçiş kodunda kullanılabilir
- `unknown`, sınır verilerinde `any` yerine tercih edilir
- Non-null assertion (`!`) gerekçesiz kullanılmaz

## 4. Import kuralları

- Uygulamalar birbirini doğrudan import etmez.
- `apps/web`, `apps/api` içinden import yapmaz.
- Domain paketi altyapı paketlerini import etmez.
- Circular dependency yasaktır.
- Public package API'si `index.ts` üzerinden sınırlı sunulur.
- Derin path import, açıkça public değilse kullanılmaz.

## 5. Katmanlar

Backend modülü örneği:

```text
modules/scanner/
├── domain/
├── application/
├── infrastructure/
├── presentation/
└── scanner.module.ts
```

### Domain

- entity
- value object
- domain service
- domain error
- repository interface

### Application

- use case
- command/query
- DTO mapping
- transaction boundary

### Infrastructure

- database implementation
- provider adapter
- queue adapter
- external service

### Presentation

- REST controller
- request/response DTO
- authorization guard

## 6. Fonksiyon ve sınıf ölçütleri

Katı satır limiti yerine bakım yapılabilirlik hedeflenir.

- Fonksiyon tek iş yapmalıdır.
- Uzun ve çok dallanan fonksiyonlar parçalanmalıdır.
- Sınıfın birincil sorumluluğu tek cümlede açıklanabilmelidir.
- Dosya büyüklüğü otomatik kalite göstergesi değildir.
- Finansal algoritmalar küçük, saf ve test edilebilir fonksiyonlardan oluşmalıdır.

## 7. Hata yönetimi

- Domain hatası, HTTP hatası değildir.
- Controller/application boundary'de hata eşlemesi yapılır.
- Her kullanıcıya gösterilen hata bir `code` taşır.
- Stack trace production yanıtında gösterilmez.
- Beklenmeyen hata correlation id ile loglanır.
- Provider hataları normalize edilir.
- Retry edilebilir ve edilemez hatalar ayrılır.

## 8. Loglama

Log alanları:

- timestamp
- level
- service
- module
- requestId
- correlationId
- userId, uygunsa
- operation
- durationMs
- result
- errorCode

Yasak log içeriği:

- parola
- access token
- refresh token
- API secret
- tam ödeme bilgisi
- kişisel verinin gereksiz kopyası

## 9. Veri ve finansal hesaplama

- Fiyat ve oranlarda binary floating point etkisi değerlendirilir.
- Veritabanında `numeric/decimal` tercih edilir.
- İndikatör hesaplarında kullanılan sayı tipi ve tolerans testte belgelenir.
- Eksik barlar sıfır bar olarak kabul edilmez.
- Bölünme/temettü düzeltmeli ve düzeltmesiz seri karıştırılmaz.
- Bar kapanmadan üretilen geçici sinyal açıkça işaretlenir.

## 10. Test isimlendirmesi

Örnek:

```text
should_return_no_match_when_rsi_value_is_missing
should_trigger_cross_above_only_on_transition_bar
should_reject_scan_when_rule_depth_exceeds_limit
```

Her test:

- Arrange
- Act
- Assert

mantığını açıkça göstermelidir.

## 11. Yorumlar

Yorum, kodun ne yaptığını değil neden o şekilde yapıldığını açıklamalıdır.

Finansal formül kaynağı veya karar gerekçesi yorum ya da dokümanda belirtilir.

## 12. Feature flag

- Tamamlanmamış özellik branch kontrolüyle değil feature flag ile kapatılabilir.
- Güvenlik kontrolü feature flag'e bırakılmaz.
- Flag varsayılanı güvenli davranış olmalıdır.

## 13. Definition of Done

Bir görev tamamlanmış sayılmaz, eğer:

- kabul kriterleri doğrulanmadıysa,
- testler yazılmadıysa,
- lint/typecheck başarısızsa,
- ilgili doküman güncellenmediyse,
- migration etkisi değerlendirilmediyse,
- gözlemlenebilirlik eklenmediyse,
- güvenlik etkisi düşünülmediyse.
