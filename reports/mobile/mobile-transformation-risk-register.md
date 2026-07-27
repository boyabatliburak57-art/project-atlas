# Mobile Transformation Risk Register

**Baseline date:** 2026-07-28  
**Review cadence:** At every TASK-100B–TASK-100L transition

Probability and impact use `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`. `OPEN` means mitigation evidence is
not yet complete.

| ID           | Description                                                                            | Probability | Impact   | Mitigation                                                                                                       | Owner role           | Target task                   | Status |
| ------------ | -------------------------------------------------------------------------------------- | ----------- | -------- | ---------------------------------------------------------------------------------------------------------------- | -------------------- | ----------------------------- | ------ |
| MOB-RISK-001 | Scope expansion creates an unfinishable mobile v1.0.                                   | HIGH        | HIGH     | Enforce baseline exclusions and change control; TASK-100L treats unapproved scope as deviation.                  | Product Owner        | TASK-100A/TASK-100L           | OPEN   |
| MOB-RISK-002 | Web and mobile feature behavior diverges.                                              | HIGH        | HIGH     | Shared OpenAPI contracts, server-authoritative rules and cross-surface regression matrix.                        | Mobile Tech Lead     | TASK-100B/TASK-100L           | OPEN   |
| MOB-RISK-003 | Existing APIs lack mobile-efficient or native lifecycle contracts.                     | HIGH        | HIGH     | OpenAPI gap inventory, generated client drift gate and owner-scoped contract tests before UI work.               | API Lead             | TASK-100B–TASK-100J           | OPEN   |
| MOB-RISK-004 | Financial charts exceed phone memory/frame budgets or lose semantic accuracy.          | MEDIUM      | HIGH     | Library spike, bounded datasets, pure fixture-tested transforms and physical-device baselines.                   | Mobile Tech Lead     | TASK-100B/TASK-100E/TASK-100K | OPEN   |
| MOB-RISK-005 | Session secrets are stored outside SecureStore or leak through backups/logs.           | MEDIUM      | CRITICAL | SecureStore-only token adapter, source/bundle/cache/log inspection and logout wipe tests.                        | Security Lead        | TASK-100D/TASK-100J           | OPEN   |
| MOB-RISK-006 | Push retries or token rotation deliver duplicate notifications.                        | MEDIUM      | HIGH     | Owner/device binding, idempotency key, receipt reconciliation, dedupe and replay tests.                          | Notifications Lead   | TASK-100F                     | OPEN   |
| MOB-RISK-007 | Deep links bypass authentication or resource ownership checks.                         | MEDIUM      | CRITICAL | Typed allowlist, authenticate before resolve and server reauthorization for every target.                        | Security Lead        | TASK-100C/TASK-100J           | OPEN   |
| MOB-RISK-008 | Offline users mistake cached data for fresh market data.                               | HIGH        | HIGH     | Timestamped read-only cache, persistent stale/offline banners and foreground refetch without fake freshness.     | Mobile Product Lead  | TASK-100J                     | OPEN   |
| MOB-RISK-009 | Tablet layouts become stretched phone layouts with unusable information density.       | MEDIUM      | MEDIUM   | Tablet portrait/landscape design variants, keyboard support and visual regression matrix.                        | Design Systems Lead  | TASK-100C/TASK-100K           | OPEN   |
| MOB-RISK-010 | Mobile changes regress VoiceOver, TalkBack, dynamic type or focus order.               | MEDIUM      | HIGH     | Accessible primitives, manual screen-reader scripts, automated checks and zero-critical gate.                    | Accessibility Lead   | TASK-100C/TASK-100K           | OPEN   |
| MOB-RISK-011 | Native dependencies become unmaintained or incompatible with Expo/React Native.        | MEDIUM      | HIGH     | Compatibility/license/new-architecture review, adapter isolation and pinned upgrade policy.                      | Mobile Platform Lead | TASK-100B/TASK-100J           | OPEN   |
| MOB-RISK-012 | Client feature flags disagree with real provider capabilities.                         | HIGH        | HIGH     | Server-authoritative bootstrap/capability reason codes; mobile may disable but never enable.                     | Platform Lead        | TASK-100J                     | OPEN   |
| MOB-RISK-013 | Fixture/fake provider data is accidentally exposed as production data.                 | MEDIUM      | CRITICAL | Fail-closed composition, visible unavailable states, environment tests and fake-claim counter in TASK-100L.      | Data Platform Lead   | TASK-100E/TASK-100J/TASK-100L | OPEN   |
| MOB-RISK-014 | Audit criteria are weakened through skips, rebaselines or missing-evidence exemptions. | MEDIUM      | CRITICAL | Immutable candidate, zero skip/retry-only rule, 100% screenshot ledger and independent TASK-100L.                | QA/Audit Lead        | TASK-100K/TASK-100L           | OPEN   |
| MOB-RISK-015 | External credentials, legal approval or staging access delay launch evidence.          | HIGH        | HIGH     | Keep external blockers explicit; do not convert local/sandbox evidence; schedule TASK-100R only after parity GO. | Release Manager      | TASK-100R                     | OPEN   |

## Current assessment

Open risks: 15  
Accepted/closed risks: 0  
Critical-impact open risks: 4

This register does not assert that any mitigation has been implemented. Owners are accountable
roles, not named assignees.
