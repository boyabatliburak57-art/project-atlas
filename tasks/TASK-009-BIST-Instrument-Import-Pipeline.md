# TASK-009 — BIST Instrument Import Pipeline

**Durum:** Tamamlandı
**Bağımlılık:** TASK-008

## Amaç

Provider adapter'dan gelen BIST instrument listesini normalize edip veritabanına idempotent şekilde yazan application service ve worker job'ı oluşturmak.

## Kapsam

- symbol normalization
- provider mapping upsert
- instrument create/update
- deactivation preview
- ingestion run kaydı
- dry-run
- metrics/logs
- fake provider integration test

## Kritik kural

Provider listesinde bulunmayan mevcut instrument otomatik olarak silinmez.

Deactivation ayrı onay veya güvenli politika gerektirir.

## Edge case

- sembol değişikliği
- duplicate provider symbol
- eksik şirket adı
- aynı ISIN farklı sembol
- provider geçici eksik liste
- invalid character
- suspended instrument

## Kabul kriterleri

- tekrar çalıştırma duplicate üretmez
- dry-run veritabanını değiştirmez
- mapping doğru oluşur
- şüpheli silme/deactivation raporlanır
- ingestion run sonucu saklanır
- integration test geçer

## T3 Code prompt

```text
TASK-009 görevini uygula.
ARCH-002 ve DB-002 belgelerini oku.
Fake provider kullanarak BIST instrument import application service ve worker job'ı oluştur.
İşlemi idempotent yap.
Provider listesinden kaybolan enstrümanı otomatik silme; yalnızca raporla.
Dry-run ve integration test ekle.
```

## Tamamlanma notu

- **Tarih:** 2026-07-12
- **Durum:** Tamamlandı
- **Değişiklik:** BIST symbol normalizasyonu, provider instrument import service, PostgreSQL
  transaction store, sürümlü worker job sözleşmesi, dry-run ve güvenli metrik/log akışı eklendi.
- **Idempotency:** Mapping, ardından ISIN, ardından aktif normalized symbol eşleştirilir;
  tekrar çalıştırma duplicate instrument veya mapping üretmez.
- **Güvenlik:** Provider cevabı TASK-008 validation sınırından geçer; queue payload secret veya
  ham provider verisi taşımaz; hata kaydında normalize error code kullanılır.
- **Migration:** Yok; TASK-007 tabloları kullanıldı.
- **Test:** Unit testlere ek olarak PostgreSQL 17 üzerinde fake provider ile idempotency,
  dry-run, mapping, deactivation preview, ingestion run ve sembol değişimi doğrulandı.
- **Bilinen sınırlama:** Eksik instrument/mapping otomatik deactivate edilmez; yalnızca aday
  olarak raporlanır. Gerçek provider ve production schedule kapsam dışıdır.
- **Sonraki görev:** TASK-010
