# ADR-003 — Tarama Kuralları için Sürümlü AST

**Durum:** Kabul edildi  
**Tarih:** 2026-07-11

## Bağlam

Kullanıcılar indikatör, alan, operatör, zaman dilimi ve mantıksal gruplardan tarama oluşturacaktır.

Kuralların düz metin, SQL veya çalıştırılabilir JavaScript olarak saklanması güvenlik ve migration riski yaratır.

## Karar

Tarama kuralları JSON tabanlı, sürümlü ve doğrulanan bir Abstract Syntax Tree olarak saklanacaktır.

## Ana node türleri

- `group`
- `condition`
- `indicatorOperand`
- `fieldOperand`
- `numberOperand`
- `booleanOperand`

## Özellikler

- `version`
- izin listeli operatör,
- şema doğrulama,
- maksimum derinlik,
- maksimum node sayısı,
- complexity score,
- migration desteği,
- açıklama üretimi.

## Yasaklar

AST içinde:

- SQL,
- JavaScript,
- eval edilebilir kod,
- provider sorgusu,
- serbest fonksiyon adı

saklanamaz.

## Sonuç

Kural motoru UI'dan, veritabanından ve provider'dan bağımsız şekilde doğrulanabilir ve test edilebilir olur.
