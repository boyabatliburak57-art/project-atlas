# DOC-041 — Staging Environment Bootstrap and Evidence Requirements

## Amaç

Production Readiness GO için gerekli gerçek staging ortamını ve kanıt zincirini tanımlar.

## Zorunlu bileşenler

- HTTPS staging URL
- Container registry
- API ve worker deployment'ları
- PostgreSQL
- Redis
- Object storage
- DNS/TLS
- Normal ve admin synthetic kullanıcılar
- Load, chaos ve DAST yetkileri
- Previous known-good image digest
- Rollback workflow

## Temiz kaynak

RC yalnız temiz çalışma ağacı, push edilmiş commit, benzersiz SHA, doğrulanmış lockfile ve başarılı CI üzerinden üretilir.

## Immutable release

Release kaydı RC version, commit SHA, registry digest, base image digest, migration manifest, config schema, flag snapshot, SBOM, audit, scan, provenance ve release notes taşır.

## Staging kanıtı sayılmayanlar

- Local Docker
- Mock/in-memory servis
- Eski DAST artifact'i
- Mutable latest tag
- Digest'e bağlı olmayan SBOM veya scan
- Yalnız workflow tanımı
- Yalnız backup status

## GO kanıtları

- Load 3/3
- Chaos 6/6
- Immutable RC
- Staging synthetics
- Rollback
- Current DAST
- Incident game-day
- Digest-bound artifacts
- Full regression
