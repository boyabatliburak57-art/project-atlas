# TASK-110D — KAP & Corporate Event Intelligence

**Durum:** BLOCKED_BY_TASK-110C
**Bağımlılıklar:** TASK-110C = `GO_FOR_TASK_110D`

## Amaç

KAP Intelligence, corporate/result events, new business relationships, buybacks, dividends,
capital actions and IPO Center'ı shared disclosure/event/action domains üzerinden sağlamak.

## Gereksinimler

Source document links, revisions, issuer identity, event classification, effective dates, timezone,
deduplication, correction lineage and provider status must be visible. Summaries must remain
source-aware and non-advisory.

## Test ve kabul

Test revisions, duplicate notices, missing attachments, corrected dates, stale feeds, restricted
sources and portfolio corporate-action compatibility. Eight capabilities must be complete without a
parallel KAP/event store; result is `GO_FOR_TASK_110E`.
