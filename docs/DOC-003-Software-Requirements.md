# DOC-003 — Software Requirements Specification

**Sürüm:** 1.0  
**Durum:** Taslak

## 1. Sistem bağlamı

Project Atlas web istemcisi, backend API, worker süreçleri, PostgreSQL, Redis, piyasa veri sağlayıcı adaptörleri ve bildirim sağlayıcılarından oluşur.

## 2. Teknoloji temeli

### Frontend

- Next.js
- React
- TypeScript strict mode
- Tailwind CSS
- shadcn/ui
- TanStack Query
- gerektiği kadar Zustand
- lisansı uygun finansal grafik kütüphanesi

### Backend

- NestJS
- REST API
- OpenAPI
- BullMQ tabanlı iş kuyruğu
- gerektiğinde WebSocket veya SSE

### Veri

- PostgreSQL
- Redis
- veri hacmi doğrulanırsa TimescaleDB değerlendirmesi
- büyük raporlar için object storage

## 3. Fonksiyonel gereksinimler

### FR-MD-001 — Sembol evreni

Sistem sembol, şirket adı, sektör, pazar, endeks üyeliği, ISIN ve aktiflik durumunu saklamalıdır.

### FR-MD-002 — OHLCV

Desteklenen zaman dilimlerinde açık, yüksek, düşük, kapanış ve hacim verisi saklanmalıdır.

### FR-MD-003 — Veri tazeliği

Her veri kaydı sağlayıcı, piyasa zamanı, ingest zamanı ve revizyon bilgisi taşımalıdır.

### FR-IND-001 — İndikatör hesaplama

İndikatör motoru sembol, zaman dilimi, tarih aralığı ve parametrelerle deterministik sonuç üretmelidir.

### FR-IND-002 — Warm-up

Her indikatör gerekli minimum geçmiş bar sayısını bildirmelidir.

### FR-SCN-001 — Kural modeli

Tarama koşulları doğrulanabilir, sürümlü JSON AST olarak saklanmalıdır.

### FR-SCN-002 — Mantıksal gruplama

AND, OR ve iç içe grup desteklenmelidir.

### FR-SCN-003 — Kesişim

Yukarı ve aşağı kesişim operatörleri mevcut ve önceki barı birlikte kullanmalıdır.

### FR-SCN-004 — Açıklama

Her sembol için kural bazlı değerlendirme ve hesaplanan değerler üretilebilmelidir.

### FR-ALT-001 — Alarm değerlendirme

Alarm yalnızca ilgili veri güncellendiğinde veya tanımlı periyotta değerlendirilmelidir.

### FR-ALT-002 — Tekilleştirme

Aynı alarmın aynı bar için tekrarlı bildirim üretmesi engellenmelidir.

### FR-IAM-001 — Kimlik doğrulama

Kullanıcı e-posta ve parola ile hesap oluşturabilmelidir.

### FR-IAM-002 — Yetkilendirme

Rol, plan ve kota kontrolleri backend tarafında uygulanmalıdır.

### FR-AUD-001 — Audit

Yönetici işlemleri ve kritik kullanıcı işlemleri denetim kaydına yazılmalıdır.

## 4. Fonksiyonel olmayan gereksinimler

### NFR-PERF-001

Sık kullanılan hazır taramalar cache veya ön hesaplama ile düşük gecikmeyle sunulmalıdır.

### NFR-PERF-002

Ağır taramalar kuyruk üzerinden çalıştırılabilmeli ve kullanıcı ilerleme/durum bilgisi almalıdır.

### NFR-AVAIL-001

Tek veri sağlayıcı kesintisi tüm uygulamayı çalışamaz hale getirmemeli; veri stale olarak işaretlenebilmelidir.

### NFR-SEC-001

OWASP Top 10 risklerine karşı temel korumalar uygulanmalıdır.

### NFR-SEC-002

Parola hash için Argon2id veya güncel eşdeğer kullanılmalıdır.

### NFR-OBS-001

Structured log, metric ve trace ortak correlation id kullanmalıdır.

### NFR-DATA-001

Tüm zamanlar UTC saklanmalıdır.

### NFR-DATA-002

Finansal tutar ve oranlarda uygun decimal veri tipi kullanılmalıdır.

### NFR-MAINT-001

Modül sınırları import kurallarıyla korunmalıdır.

### NFR-TEST-001

İndikatör, tarama operatörü, alarm tekilleştirme ve entitlement kuralları birim testlerle doğrulanmalıdır.

## 5. Tarama AST örneği

```json
{
  "version": 1,
  "root": {
    "type": "group",
    "operator": "AND",
    "children": [
      {
        "type": "condition",
        "left": {
          "kind": "indicator",
          "name": "RSI",
          "params": { "period": 14 },
          "timeframe": "1d"
        },
        "operator": "LT",
        "right": { "kind": "number", "value": 35 }
      },
      {
        "type": "condition",
        "left": {
          "kind": "indicator",
          "name": "EMA",
          "params": { "period": 20 },
          "timeframe": "1d"
        },
        "operator": "CROSSES_ABOVE",
        "right": {
          "kind": "indicator",
          "name": "EMA",
          "params": { "period": 50 },
          "timeframe": "1d"
        }
      }
    ]
  }
}
```

## 6. Veri bütünlüğü

- Aynı sembol, zaman dilimi, sağlayıcı, revizyon ve bar başlangıcı için benzersizlik uygulanmalıdır.
- Revize veri geçmişi korunmalıdır.
- Kurumsal aksiyon düzeltmeleri ham veriyi yok etmeden yönetilmelidir.
- Veri boşlukları raporlanmalıdır.
- Kapanmamış bar `isClosed=false` olmalıdır.

## 7. Hata kodları

- `AUTH_INVALID_CREDENTIALS`
- `AUTH_EMAIL_ALREADY_EXISTS`
- `ENTITLEMENT_LIMIT_REACHED`
- `SCAN_RULE_INVALID`
- `SCAN_TOO_COMPLEX`
- `MARKET_DATA_STALE`
- `PROVIDER_UNAVAILABLE`
- `INDICATOR_NOT_SUPPORTED`
- `ALERT_CHANNEL_UNAVAILABLE`

## 8. Ortamlar

- local
- test
- staging
- production

Her ortam ayrı secret, veri bağlantısı ve uygun log seviyesine sahip olmalıdır.

## 9. Hukuki inceleme başlıkları

- kullanım koşulları
- gizlilik ve çerez tercihleri
- veri sağlayıcı lisansı
- yatırım tavsiyesi olmadığı uyarısı
- kişisel veri koruma yükümlülükleri
