# ADR-002 — Backend için TypeScript ve NestJS

**Durum:** Kabul edildi  
**Tarih:** 2026-07-11

## Bağlam

Frontend TypeScript kullanacaktır. Üründe API, worker, queue, validation ve ortak contract ihtiyacı bulunmaktadır.

## Karar

Ana backend ve worker uygulamaları TypeScript ile geliştirilecek; backend framework olarak NestJS kullanılacaktır.

## Gerekçe

- monorepo içinde ortak tipler,
- modül yapısı,
- dependency injection,
- OpenAPI desteği,
- queue ve worker entegrasyonu,
- test ekosistemi,
- T3 Code ile çok dosyalı geliştirmede tutarlı yapı.

## Sınır

Bu karar tüm nicel hesaplamaların sonsuza kadar TypeScript ile yazılacağı anlamına gelmez.

Gelecekte:

- yoğun bilimsel hesap,
- ML modeli,
- özel Python kütüphanesi ihtiyacı

ölçülürse ayrı worker adapter'ı değerlendirilebilir.

İlk indikatör ve scanner motoru TypeScript içinde geliştirilir.

## Risk

JavaScript number davranışı finansal hesaplarda dikkat ister.

Önlemler:

- deterministic tests,
- açık tolerans,
- decimal veri tipi,
- saf fonksiyonlar,
- referans seri doğrulaması.
