# TASK-001 — Repository Foundation Validation

**Durum:** Hazır  
**Bağımlılık:** Yok

## Amaç

Repository dokümantasyon yapısını doğrulamak ve eksik temel dosyaları raporlamak.

## Kapsam

- klasör ve dosya yapısını kontrol et
- `ATLAS_INDEX.md` yollarını doğrula
- Markdown bağlantılarını kontrol et
- Mermaid bloklarını raporla
- isimlendirme standardını doğrula

## Kapsam dışı

- uygulama kodu
- framework kurulumu
- Docker kurulumu

## Kabul kriterleri

- tüm zorunlu dosyalar doğrulanır
- eksikler açıkça raporlanır
- indeks yolları geçerlidir
- Markdown lint için temel öneri hazırlanır
- uygulama kodu üretilmez

## T3 Code prompt

```text
Repository kökünü ve ATLAS_INDEX.md dosyasını incele. Zorunlu belgelerin mevcut olup olmadığını doğrula. Eksik veya yanlış yolları düzelt. Markdown lint için yalnızca dokümantasyon kapsamındaki gerekli yapılandırmayı ekle. Uygulama framework'ü kurma. Sonucu raporla.
```
