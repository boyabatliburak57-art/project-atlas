# ADR-005 — Üç Durumlu Tarama Değerlendirmesi

**Durum:** Kabul edildi  
**Tarih:** 2026-07-11

## Karar

Condition ve group değerlendirmesi şu durumları kullanır:

- matched
- notMatched
- notEvaluable

Eksik veri veya yetersiz warm-up doğrudan false kabul edilmez.

## AND

- herhangi bir child notMatched ise notMatched
- tüm child matched ise matched
- diğer durumda notEvaluable

## OR

- herhangi bir child matched ise matched
- tüm child notMatched ise notMatched
- diğer durumda notEvaluable

## Sonuç

Kullanıcı “koşul sağlanmadı” ile “hesaplanamadı” ayrımını görebilir.
