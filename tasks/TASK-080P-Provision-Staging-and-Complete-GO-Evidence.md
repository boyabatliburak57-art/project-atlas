# TASK-080P — Provision Staging and Complete Production Readiness GO Evidence

## Amaç

Mevcut repository ve mevcut IaC/deployment tercihini kullanarak staging ortamını kurmak veya tamamlamak, immutable RC üretmek, bütün gerçek staging kanıtlarını çalıştırmak ve TASK-080 final re-audit raporunu hazırlamak.

## Aşamalar

1. Source clean-up and release commit
2. Access preflight
3. Staging infrastructure provisioning/update
4. RC build/push/digest
5. Supply-chain artifacts
6. Staging deployment
7. Synthetics
8. Load
9. Chaos
10. Rollback
11. DAST
12. Incident game-day
13. Full regression
14. Re-audit

## Platform kararı

Mevcut platform/IaC varsa onu kullan. Yeni provider'ı yalnız repository ve organizasyon standardı açıkça destekliyorsa seç. Gerçek erişim yoksa sahte provisioning veya GO üretme.

## Çıktılar

- `reports/staging/staging-preflight.md`
- `reports/staging/staging-environment-record.json`
- `reports/release/<rc>/...`
- `reports/load/<rc>/...`
- `reports/chaos/<rc>/...`
- `reports/security/<rc>/...`
- `reports/incidents/<incident-id>.md`
- `reports/production-readiness-milestone-reaudit.md`
