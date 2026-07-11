# DOC-006 — Security and Privacy Requirements

**Sürüm:** 1.0  
**Durum:** Onay için hazır

## 1. Amaç

Project Atlas kullanıcı hesaplarını, özel taramaları, alarmları, portföy kayıtlarını ve yönetim işlevlerini güvenli şekilde korumalıdır.

Bu belge hukuki görüş değildir. Kişisel veri, veri lisansı ve finansal düzenleme konuları uzman hukuk incelemesine sunulmalıdır.

## 2. Tehdit modeli kapsamı

Korunacak varlıklar:

- kullanıcı hesabı,
- oturumlar,
- parola hash'leri,
- e-posta adresleri,
- kayıtlı taramalar,
- watchlist,
- portföy kayıtları,
- abonelik ve entitlement bilgileri,
- provider kimlik bilgileri,
- yönetici işlemleri,
- piyasa veri bütünlüğü.

Başlıca tehditler:

- credential stuffing,
- brute force,
- token çalınması,
- yetki yükseltme,
- IDOR,
- SQL injection,
- XSS,
- CSRF,
- kötü amaçlı tarama kuralı,
- kaynak tüketme saldırısı,
- webhook kötüye kullanımı,
- admin hesabı ele geçirilmesi,
- hassas log sızıntısı.

## 3. Kimlik doğrulama

- Parola minimum politikası uygulanır.
- Parola hash'i Argon2id veya eşdeğer güncel algoritmayla üretilir.
- Refresh token veritabanında düz metin saklanmaz.
- Refresh token rotation uygulanır.
- Token tekrar kullanımı algılanırsa ilgili token ailesi iptal edilir.
- E-posta doğrulama token'ı kısa ömürlü ve tek kullanımlık olur.
- Parola sıfırlama, hesabın varlığını ifşa etmeyen yanıt üretir.
- Başarısız girişler rate limit ve risk kurallarına tabidir.

## 4. Yetkilendirme

- Her kaynak erişimi backend tarafında doğrulanır.
- Kullanıcı yalnızca sahibi olduğu özel kaynağa erişebilir.
- Admin endpointleri ayrı permission gerektirir.
- Plan kotası UI'da gösterilse de backend'de zorunlu uygulanır.
- Object ID tahmin edilebilir olsa bile erişim kontrolü atlanamaz.
- Public paylaşım bağlantıları iptal edilebilir ve scope sınırlı olur.

## 5. Session güvenliği

Web istemcisinde tercih edilen yaklaşım:

- secure,
- httpOnly,
- sameSite politikası belirlenmiş cookie,
- kısa ömürlü access,
- rotasyonlu refresh.

Cookie tabanlı kimlik doğrulamada CSRF koruması zorunludur.

## 6. Input validation

Tüm dış girdiler şema doğrulamasından geçer:

- API body
- query parameter
- path parameter
- webhook payload
- provider response
- import dosyası
- scan rule AST
- admin içerik girişi.

Tarama AST için:

- maksimum derinlik,
- maksimum koşul sayısı,
- izin verilen operatörler,
- indikatör parametre aralığı,
- zaman dilimi izin listesi,
- maliyet tahmini

uygulanır.

## 7. Rate limit ve abuse prevention

Ayrı limit sınıfları:

- login,
- registration,
- password reset,
- scan validation,
- scan execution,
- export,
- webhook,
- admin.

Ağır tarama kotası plan ve kullanıcı bazında kontrol edilir.

## 8. Secret yönetimi

- Secret repoya commit edilmez.
- `.env` commit edilmez.
- `.env.example` yalnızca örnek anahtar içerir.
- Production secret'ları secret manager üzerinden sağlanır.
- Provider anahtarları loglanmaz.
- Secret rotation prosedürü belgelenir.

## 9. Veri gizliliği

- Kullanıcı portföyü private varsayılır.
- Kaydedilen tarama private varsayılır.
- Analitik olaylara gereksiz finansal ayrıntı eklenmez.
- Silme ve hesap kapatma süreçleri tasarlanır.
- Veri saklama süreleri veri kategorisine göre belgelenir.
- Backup içindeki kişisel veri de saklama politikasına dahildir.

## 10. Admin güvenliği

- Admin erişimi ayrı permission gerektirir.
- Kritik admin işlemleri audit log üretir.
- Admin için MFA production öncesinde zorunlu hale getirilir.
- Impersonation özelliği ilk sürümde yapılmaz.
- Provider credential görüntüleme arayüzü yapılmaz.
- Kritik değişikliklerde yeniden kimlik doğrulama değerlendirilebilir.

## 11. Webhook ve dış bildirim

- HTTPS zorunlu.
- Hedef URL doğrulanır.
- Private network ve metadata endpointlerine erişimi engellemek için SSRF koruması uygulanır.
- Payload imzalanabilir.
- Retry sınırlıdır.
- Hassas kullanıcı verisi payload'a eklenmez.

## 12. Dependency güvenliği

CI içinde:

- dependency audit,
- secret scan,
- static analysis,
- container image scan

çalıştırılır.

Kritik açıklar için düzeltme SLA'sı ayrıca tanımlanır.

## 13. Güvenlik olayları

Her olay için:

- algılama,
- sınıflandırma,
- containment,
- düzeltme,
- kullanıcı etkisi,
- root cause,
- postmortem

süreci tanımlanmalıdır.

## 14. Güvenlik kabul kriterleri

- Auth endpointleri rate limited.
- Kaynak sahipliği tüm özel endpointlerde test edilmiş.
- Secret scan CI içinde çalışıyor.
- Scan AST complexity limit uygulanmış.
- Admin işlemleri audit log üretiyor.
- Production hata yanıtında stack trace yok.
- Hassas alanlar loglarda maskeleniyor.
