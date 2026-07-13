# ADR-007 — Immutable Saved and Preset Scan Revisions

**Durum:** Accepted  
**Tarih:** 2026-07-11

## Bağlam

Kayıtlı tarama değiştiğinde geçmiş run'ın hangi kural ve indikatör sürümüyle üretildiği korunmalıdır.

## Karar

Saved scan ve preset scan kuralları immutable revision kayıtları olarak saklanır. Parent resource yalnız current revision referansını taşır.

## Sonuç

Geçmiş run açıklanabilir, concurrent update conflict yönetilebilir ve published preset sessizce değişmez.

## Kural

Mevcut revision satırındaki Rule AST update edilmez.
