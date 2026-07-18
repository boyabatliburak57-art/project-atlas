# v0.8 Delta Entegrasyon Talimatı

Bu paket yalnız yeni v0.8 belgelerini içerir.

## Kopyalama

```bash
cd ~/Documents/project-atlas
cp -R ~/Downloads/project-atlas-blueprint-v0.8-strategy-lab-backtesting-delta/. .
```

## T3 Code entegrasyon promptu

```text
INTEGRATION_INSTRUCTIONS.md ve v0.8 belgelerini oku.

Mevcut README.md, ATLAS_INDEX.md ve CHANGELOG.md içeriklerini silmeden v0.8 Strategy Lab, Backtesting and Research Experiments bölümünü ekle.

Sabit ADR numarası üretme.
TASK-062 sırasında repository'deki sonraki boş ADR kimliklerini kullan.
Mevcut performance threshold ve baseline'ları değiştirme.

Sonunda:
- pnpm format:check
- pnpm validate:adr
- git diff --check

çalıştır.
```

## ATLAS_INDEX bölüm önerisi

```markdown
## v0.8 Strategy Lab, Backtesting and Research Experiments

Belgeler:

- DOC-030–DOC-034
- ARCH-013–ARCH-015
- Backtesting Policies Decision Proposal
- DB-008
- API-008
- Backtest Data Integrity Guide
- Backtest Test Matrix
- Backtest Performance Baseline

Görev sırası: TASK-061 → TASK-070.

TASK-070 sonucu GO olmadan sonraki pakete geçilmez.
```

## CHANGELOG bölüm önerisi

```markdown
## 0.8.0-strategy-lab — 2026-07-18

### Eklendi

- Backtesting ve strategy versioning
- Execution/cost/data integrity
- Research experiments
- Deterministic engine
- Worker/result/experiment runtime
- DB-008 ve API-008
- TASK-061–TASK-070
```
