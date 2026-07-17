# v0.7 Delta Entegrasyon Talimatı

Bu paket yalnız yeni v0.7 belgelerini içerir.

## Kopyalama

```bash
cd ~/Documents/project-atlas
cp -R ~/Downloads/project-atlas-blueprint-v0.7-market-intelligence-delta/. .
```

## Entegrasyon

Mevcut README, ATLAS_INDEX ve CHANGELOG içeriklerini silmeden şu bölümü ekle:

```markdown
## v0.7 Market Intelligence, Symbol Detail and Advanced Charting

Belgeler:

- DOC-025–DOC-029
- ARCH-010–ARCH-012
- Market Intelligence Decision Proposal
- DB-007
- API-007
- Market Intelligence Test/Performance/Chart guides

Görev sırası: TASK-051 → TASK-060.

TASK-060 GO olmadan sonraki pakete geçilmez.
```

## T3 Code entegrasyon promptu

```text
INTEGRATION_INSTRUCTIONS.md ve v0.7 yeni belgelerini oku.

Mevcut README.md, ATLAS_INDEX.md ve CHANGELOG.md içeriklerini silmeden v0.7 bölümünü ekle.

Sabit ADR numarası üretme. TASK-052 repository'deki sonraki boş ADR kimliklerini kullanacak.

Ardından:
- pnpm format:check
- pnpm validate:adr
- git diff --check

komutlarını çalıştır.
```
