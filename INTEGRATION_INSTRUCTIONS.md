# v0.6.1 Remediation Delta Entegrasyonu

## Kopyalama

```bash
cd ~/Documents/project-atlas
cp -R ~/Downloads/project-atlas-blueprint-v0.6.1-portfolio-risk-remediation-delta/. .
```

## Mevcut indekslere eklenecek bölüm

```markdown
## v0.6.1 Portfolio/Risk Remediation

TASK-050 sonucu NO-GO:

- PERF-PORT-006 gerçek application/API cursor pagination yolu eksik
- Watchlist market summary p95, 750 ms eşiğini aşıyor

Görev sırası: TASK-050A → TASK-050B → TASK-050C.

TASK-050C GO olmadan sonraki pakete geçilmez.
```

## Doğrulama

```bash
pnpm format:check
pnpm validate:adr
git diff --check
```
