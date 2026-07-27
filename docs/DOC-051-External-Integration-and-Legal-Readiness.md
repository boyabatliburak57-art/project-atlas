# DOC-051 — External Integration and Legal Readiness

## Durum

Repository teknik olarak final staging gate'e hazırdır. Ancak dış kaynaklı üç zorunlu launch blocker devam eder:

1. Gerçek veri sağlayıcısı, credential ve lisans/redistribution hakları
2. Production e-posta sağlayıcısı ve doğrulanmış gönderim alan adı
3. Hukuk danışmanı onaylı production belgeleri

## Kanıt sınıfları

- `REAL_INTEGRATION`
- `SANDBOX_INTEGRATION`
- `CREDENTIAL_REQUIRED`
- `LEGAL_REVIEW_REQUIRED`
- `APPROVED_FOR_PRODUCTION`

Fake, fixture veya sandbox kanıtı production kanıtı değildir.

## Kaynak bütünlüğü

External readiness çalışması yalnız:

- temiz çalışma ağacı,
- push edilmiş commit SHA,
- güncel lockfile,
- başarılı CI

üzerinden yürütülür.

## Provider readiness

Zorunlu kanıtlar:

- ticari/teknik sağlayıcı seçimi,
- capability listesi,
- sözleşme ve lisans kapsamı,
- redistribution hakkı,
- credential secret-store kaydı,
- canlı auth/health/rate-limit testi,
- canlı örnek veri contract doğrulaması,
- publication/revision/available-at doğrulaması,
- correction/outage davranışı.

## E-posta readiness

- production account,
- verified sending domain,
- SPF,
- DKIM,
- DMARC,
- webhook signature secret,
- bounce/complaint testleri,
- unsubscribe,
- security-message exception,
- live test mailbox delivery.

## Legal readiness

Yedi belge hukuk danışmanı tarafından incelenmeden production yayınına alınamaz. Teknik import, version, locale, effective date, consent ve re-consent akışları hazır olabilir; içerik onayı ayrı bir dış kapıdır.
