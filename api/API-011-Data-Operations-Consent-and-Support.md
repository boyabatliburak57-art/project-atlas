# API-011 — Data Operations, Consent and Support

## User

- `GET /api/v1/legal/documents`
- `GET /api/v1/legal/documents/{type}`
- `POST /api/v1/legal/consents`
- `GET /api/v1/me/consents`
- `POST/GET /api/v1/support/requests`
- `GET /api/v1/support/requests/{id}`

## Admin/Data Operations

- provider health ve ingestion history
- data-quality findings ve correction workflow
- controlled replay
- communication delivery health/templates
- support queue

Admin RBAC, ownership, attachment validation, rate limit, dangerous confirmation ve audit zorunludur.
