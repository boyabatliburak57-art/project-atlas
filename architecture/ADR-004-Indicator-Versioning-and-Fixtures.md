# ADR-004 — İndikatör Sürümleme ve Referans Fixture

**Durum:** Kabul edildi  
**Tarih:** 2026-07-11

## Karar

Her indicator definition code, integer version, parameter schema, warm-up policy ve fixture testleri taşır. Hesap davranışı değiştiğinde version artırılır.

## Gerekçe

Aynı isimli indikatör seed, warm-up ve eksik veri politikasına göre platformlar arasında farklı sonuç verebilir. Sürümleme geçmiş taramaların yeniden üretilebilirliğini korur.

## Fixture zorunluluğu

- input
- expected result
- tolerance
- first valid index
- source/reason note

Expected değer aynı implementasyonla test sırasında üretilmez.
