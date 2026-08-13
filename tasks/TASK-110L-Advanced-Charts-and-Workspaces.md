# TASK-110L — Advanced Charts & Workspaces

**Durum:** BLOCKED_BY_TASK-110K
**Bağımlılıklar:** TASK-110K = `GO_FOR_TASK_110L`

## Amaç

Market depth/order-book analytics, advanced drawings, multi-symbol comparison and persistent chart
workspaces'i existing chart architecture üzerinde genişletmek.

## Gereksinimler

Licensed depth is server-authorized and fail-closed. Drawings/workspaces are versioned and
owner-scoped. Comparison aligns sessions, currencies, units, corporate actions and as-of time.
Charts expose source/delay and remain usable with accessibility alternatives.

## Test ve kabul

Test depth loss/reconnect, entitlement revocation, drawing persistence/conflicts, large workspaces,
symbol delisting, alignment and rendering performance. Four capabilities pass; result is
`GO_FOR_TASK_110M`.
