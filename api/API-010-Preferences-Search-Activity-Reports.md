# API-010 — Preferences, Search, Activity and Reports

## Preferences

- `GET/PATCH /api/v1/me/preferences`
- `GET /api/v1/me/onboarding`
- `POST /api/v1/me/onboarding/complete`
- `POST /api/v1/me/onboarding/reset`

## Search

- `GET /api/v1/search?q=&types=&cursor=&limit=`

## Activity

- `GET /api/v1/activity`

## Reports

- `GET/POST /api/v1/reports`
- `GET/DELETE /api/v1/reports/{id}`
- `POST /api/v1/reports/{id}/cancel`
- `GET /api/v1/reports/{id}/download`

Ownership, cursor context, rate/size limits, formula injection, short-lived download ve OpenAPI zorunludur.
