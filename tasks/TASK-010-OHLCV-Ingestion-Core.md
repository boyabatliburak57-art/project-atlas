# TASK-010 — OHLCV Ingestion Core

**Durum:** Tamamlandı
**Bağımlılık:** TASK-008, TASK-009

## Amaç

Normalize edilmiş OHLCV barlarını doğrulayan ve idempotent şekilde saklayan ingest çekirdeğini oluşturmak.

## Kapsam

- fetch range command
- normalization boundary
- bar validation
- quality issue üretimi
- ingestion run
- upsert/revision policy
- closed/open bar ayrımı
- metrics
- fake provider integration test

## Kapsam dışı

- gerçek provider
- cron schedule
- indicator calculation
- timeframe aggregation
- corporate action adjustment

## Validasyon

- OHLC ilişkisi
- negatif hacim
- tarih aralığı
- duplicate
- timeframe
- future timestamp
- mapping varlığı
- sayı parse hatası

## Kabul kriterleri

- geçerli bar kaydedilir
- invalid bar quality issue oluşturur
- aynı batch tekrar çalışınca duplicate oluşmaz
- açık bar güncellenebilir
- kapalı bar revision politikası testlidir
- ingestion sayıları doğru kaydedilir

## T3 Code prompt

```text
TASK-010 görevini uygula.
ARCH-002 ve DB-002 belgelerini oku.
Fake provider ile çalışan OHLCV ingestion application service oluştur.
Validasyon, quality issue, ingestion run ve idempotent persistence ekle.
Indicator veya scanner kodu ekleme.
Integration testleri çalıştır.
```

## Tamamlanma notu

- **Tarih:** 2026-07-12
- **Durum:** Tamamlandı
- **Değişiklik:** Fetch range command, sürümlü worker job handler, contextual OHLCV validation,
  PostgreSQL persistence store, quality issue ve ingestion run metrikleri eklendi.
- **Revision:** Yeni bar revision 1; açık bar aynı revision üzerinde güncellenip kapanabilir;
  kapalı bar düzeltmesi yeni `corrected` revision üretir; kapalı bar yeniden açılamaz.
- **Idempotency:** Provider/instrument/timeframe/open time anahtarı transaction advisory lock ile
  serileştirilir. Aynı içerik duplicate metriğiyle atlanır ve yeni bar üretmez.
- **Güvenlik:** Provider response TASK-008 validation sınırından geçer; quality issue yalnızca
  normalize kod ve güvenli kimlik bilgileri taşır, ham upstream payload/hata taşımaz.
- **Migration:** Yok; TASK-007 `price_bars`, `data_quality_issues`, `ingestion_runs` ve
  `current_price_bars` yapıları kullanıldı.
- **Test:** PostgreSQL 17 üzerinde geçerli/geçersiz bar, tekrar batch, açık bar güncelleme ve
  kapanış, kapalı revision, mapping eksikliği, malformed response ve ingest sayaçları doğrulandı.
- **Bilinen sınırlama:** Gerçek provider, cron, aggregation, corporate action adjustment,
  indicator ve scanner kapsam dışıdır.
- **Sonraki görev:** Yeni görev kartı bekleniyor.
