# v0.8.1 Remediation Delta Entegrasyon Talimatı

## Kopyalama

```bash
cd ~/Documents/project-atlas
cp -R ~/Downloads/project-atlas-blueprint-v0.8.1-strategy-lab-remediation-delta/. .
```

README, ATLAS_INDEX ve CHANGELOG'a mevcut içeriği silmeden şu bölümü ekle:

```markdown
## v0.8.1 Strategy Lab Remediation

TASK-070 NO-GO bulguları:

- PERF-BT-001–006 benchmark runner eksik
- mandatory metrics ve turnover eksik
- experiment production worker wiring eksik
- full Playwright suite kararsız

Görev sırası: TASK-070A → TASK-070E.

TASK-070E GO olmadan sonraki pakete geçilmez.
```

T3 entegrasyon promptu:

```text
v0.8.1 remediation belgelerini repository'ye entegre et.
README, ATLAS_INDEX ve CHANGELOG mevcut içeriğini silme.
Yeni ADR oluşturma.
Threshold/fixture değiştirme.
Playwright skip/fixme ekleme.

pnpm format:check
pnpm validate:adr
git diff --check

çalıştır.
```
