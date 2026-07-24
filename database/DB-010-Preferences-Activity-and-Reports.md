# DB-010 — Preferences, Activity and Reports

## `user_preferences`

- user_id PK
- locale
- timezone
- default_market
- default_benchmark
- default_chart_adjustment
- default_timeframe
- quiet_hours jsonb
- accessibility jsonb
- display jsonb
- onboarding_state jsonb
- version
- timestamps

## `user_activity_events`

- id
- user_id
- event_type
- source_type/source_id
- status
- occurred_at
- summary/metadata jsonb
- deduplication_key unique
- expires_at

## `generated_reports`

- id
- owner_user_id
- report/source type/id
- status
- storage_key
- content_type/size
- methodology
- data_cutoff_at
- warnings
- timestamps/expiry/deleted_at

Ownership, retention, deduplication ve no-secret kuralları zorunludur.
