# Staging GO Runbook

## A. Source freeze

1. `git status --porcelain`
2. `git diff --check`
3. kalite kapıları
4. commit ve push
5. clean tree ve SHA doğrulama

## B. RC build

1. RC version
2. Multi-target image build
3. Registry push
4. Digest
5. SBOM
6. Dependency/container scan
7. Provenance
8. Release record

## C. Deploy

1. Backup/PITR
2. Migration compatibility/dry-run/apply
3. API ve worker deploy
4. Health/readiness
5. Queue/data freshness
6. Synthetics

## D. Evidence

1. Load 3/3
2. Chaos 6/6
3. Rollback
4. DAST
5. Incident game-day
6. Full regression
7. Re-audit

## Fail-fast

Clean commit, staging URL, immutable digest, previous digest, gerçek test yetkisi, current DAST veya rollback kanıtı eksikse GO verme.
