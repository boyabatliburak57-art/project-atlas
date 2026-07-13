# Project Atlas v0.4.1 — Scanner Core Gate Remediation Plan

**Durum:** Zorunlu  
**Kaynak:** Indicator/Scanner Core milestone audit  
**Karar:** NO-GO

## Başarısız kapılar

1. `pnpm validate:adr`: İki kabul edilmiş belge `ADR-006` kimliğini kullanıyor.
2. `pnpm format:check`: Dokuz Markdown dosyasında format farkı bulunuyor.

## Uygulama sırası

1. `TASK-021A-ADR-006-Collision-Remediation.md`
2. `TASK-021B-Markdown-Formatting-Remediation.md`
3. `TASK-021C-Indicator-Scanner-Core-Reaudit.md`

## Geçiş koşulu

TASK-021C raporu aşağıdaki sonucu vermeden TASK-022 uygulanmaz:

```text
Decision: GO
Failed gates: 0
Critical deviations: 0
pnpm validate:adr: PASS
pnpm format:check: PASS
```

## Yasak düzeltmeler

- ADR doğrulamasını gevşetmek
- ADR içeriğini silmek
- Markdown dosyalarını formatter kapsamından çıkarmak
- CI işlerini `continue-on-error` yapmak
- Başarısız komutları skip etmek
