# TASK-110G — Calendar & Event Center

**Durum:** BLOCKED_BY_TASK-110F
**Bağımlılıklar:** TASK-110F = `GO_FOR_TASK_110G`

## Amaç

Economic, earnings, dividend, corporate event, IPO and VIOP expiry calendars'ı one event model and
one filter/saved-view language üzerinden birleştirmek.

## Gereksinimler

Timezone, market session, tentative/confirmed/cancelled/revised status, source, as-of and alert
linkage are mandatory. Calendar items reference canonical events; no duplicate calendar event data.

## Test ve kabul

Test timezone/DST boundaries, date revisions, cancellations, same-event deduplication, recurring
macro releases and provider outages. Six calendars pass; result is `GO_FOR_TASK_110H`.
