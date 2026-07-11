# ADR-001 — Modular Monolith ile Başlama

**Durum:** Kabul edildi  
**Tarih:** 2026-07-11

## Bağlam

Project Atlas; kullanıcı, piyasa verisi, indikatör, tarama, alarm ve portföy modüllerine sahiptir. Ürün henüz MVP aşamasındadır ve trafik profili ölçülmemiştir.

## Karar

Sistem modüler monolith olarak geliştirilecektir.

Web, API ve worker ayrı process/container olabilir; backend domain modülleri aynı codebase ve deployment sınırında kalacaktır.

## Sonuçlar

### Olumlu

- daha hızlı geliştirme,
- daha kolay transaction,
- daha basit local ortam,
- daha az operasyonel yük,
- daha kolay refactor,
- daha düşük maliyet.

### Olumsuz

- modül sınırlarını kod kurallarıyla koruma ihtiyacı,
- tek backend deploy birimi,
- kötü tasarım halinde iç bağımlılık artışı.

## Koruma mekanizmaları

- import boundary lint,
- domain arayüzleri,
- modül bazlı klasör,
- ortak veritabanında açık ownership,
- ADR zorunluluğu,
- çapraz modül yazma işlemlerinin application service üzerinden yapılması.

## Mikroservise ayrılma sinyalleri

- bağımsız ölçeklenme ihtiyacı,
- farklı release cadence,
- hata izolasyonu gereksinimi,
- ekip ownership ayrımı,
- ölçülmüş performans darboğazı.

Bu sinyaller oluşmadan servis ayrıştırılmaz.
