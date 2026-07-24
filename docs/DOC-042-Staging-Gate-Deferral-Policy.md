# DOC-042 — Staging Gate Deferral Policy

## Karar

TASK-080 Production Readiness milestone'u:

```text
Status: DEFERRED_EXTERNAL_GATE
Decision: NO-GO_FOR_PRODUCTION
```

olarak kalır.

Bu durum staging-dışı ürün geliştirmesini engellemez; ancak production deploy, staging validated veya v1.0 launch approved iddiasına izin vermez.

## İzin verilen işler

- Domain/application/API
- Local PostgreSQL/Redis integration
- Worker integration
- Unit/API/E2E
- Accessibility ve localization
- UX/product polish
- Documentation
- Feature freeze
- Local RC packaging
- Security scans
- Local performance regression

## Yasak iddialar

- Production ready
- Production approved
- Staging validated
- Disaster recovery validated
- Load/chaos validated
- Current RC DAST validated

## Yeniden açma koşulu

- staging URL/deploy access
- registry-backed digest
- previous known-good digest
- PostgreSQL/Redis/object storage
- synthetic users
- load/chaos/DAST authorization
