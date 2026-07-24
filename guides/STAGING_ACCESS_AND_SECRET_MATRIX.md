# Staging Access and Secret Matrix

Secret değerlerini repository'ye yazma. CI/CD secret store kullan.

## Release

- `STAGING_BASE_URL`
- `CONTAINER_REGISTRY`
- `CONTAINER_REGISTRY_USERNAME`
- `CONTAINER_REGISTRY_TOKEN`
- `STAGING_IMAGE_REPOSITORY`
- `PREVIOUS_KNOWN_GOOD_IMAGE_DIGEST`

## Deployment

Mevcut platforma göre:

- `STAGING_KUBE_CONTEXT` veya deploy token
- `STAGING_NAMESPACE`
- API ve worker deployment adları
- rollback workflow yetkisi

## Data

- `STAGING_DATABASE_URL`
- `STAGING_REDIS_URL`
- object storage endpoint/bucket/credentials

## Synthetic users

- `STAGING_SYNTHETIC_USER_EMAIL`
- `STAGING_SYNTHETIC_USER_PASSWORD`
- `STAGING_SYNTHETIC_ADMIN_EMAIL`
- `STAGING_SYNTHETIC_ADMIN_PASSWORD`

## Security ve test

- `STAGING_DAST_ENABLED=true`
- `STAGING_LOAD_ENABLED=true`
- `STAGING_CHAOS_ENABLED=true`
- DAST auth context
- load/chaos authorization

Her erişim yalnız available, unavailable, invalid veya unauthorized olarak raporlanır. Secret değeri rapora yazılmaz.
