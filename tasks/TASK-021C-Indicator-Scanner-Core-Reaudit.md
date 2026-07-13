# TASK-021C — Indicator/Scanner Core Re-Audit

**Durum:** Hazır  
**Bağımlılık:** TASK-021A, TASK-021B

## Amaç

Repository kapıları giderildikten sonra milestone'u yeniden doğrulamak.

## Zorunlu kontroller

- `pnpm validate:adr`
- `pnpm format:check`
- cache dışı lint
- cache dışı typecheck
- unit ve integration testleri
- OpenAPI validation
- build
- secret scan
- dependency audit
- skip/only scan
- foundation re-audit GO kontrolü

## Çıktı

`reports/indicator-scanner-core-milestone-reaudit.md`

## GO koşulları

- failed gates: 0
- critical deviations: 0
- `validate:adr`: PASS
- `format:check`: PASS
- security not-verifiable: 0
- lint/typecheck/test/build: PASS

## T3 Code prompt

```text
TASK-021C görevini uygula.
İlk milestone audit raporunu ve TASK-021A/TASK-021B değişikliklerini incele.
Bütün repository kapılarını cache dışı çalıştır.
reports/indicator-scanner-core-milestone-reaudit.md oluştur.
Raporun başında açıkça GO veya NO-GO yaz.
GO değilse TASK-022'ye geçilmesini önerme.
```
