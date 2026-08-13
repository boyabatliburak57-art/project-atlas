# TASK-110N — Unified Alerts & Smart Inbox

**Durum:** BLOCKED_BY_TASK-110M
**Bağımlılıklar:** TASK-110M = `GO_FOR_TASK_110N`

## Amaç

Existing alerts/notification infrastructure'ı disclosures, events, institutional changes,
restrictions, calendars, anomalies and research updates için one Smart Inbox'a genişletmek.

## Gereksinimler

Contextual creation always writes `AlertDomain`; delivery and read state use
`NotificationDomain`. Deduplication, priority, quiet hours, consent, minimal push payloads,
owner-scoped deep links, source/as-of and capability withdrawal are mandatory.

## Test ve kabul

Test burst dedupe, revisions/retractions, revoked entitlement, stale alerts, cross-device read state,
deep-link reauthorization and disabled channels. Duplicate alert tools are zero; result is
`GO_FOR_TASK_110O`.
