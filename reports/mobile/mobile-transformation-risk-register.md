# Mobile Transformation Risk Register

**Baseline date:** 2026-07-28  
**Review cadence:** At every TASK-100B–TASK-100L transition

Probability and impact use `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`. `OPEN` means mitigation evidence is
not yet complete.

| ID                       | Description                                                                                                            | Probability | Impact   | Mitigation                                                                                                                                                                                   | Owner role                     | Target task                   | Status             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ----------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ----------------------------- | ------------------ |
| MOB-RISK-001             | Scope expansion creates an unfinishable mobile v1.0.                                                                   | HIGH        | HIGH     | Enforce baseline exclusions and change control; TASK-100L treats unapproved scope as deviation.                                                                                              | Product Owner                  | TASK-100A/TASK-100L           | OPEN               |
| MOB-RISK-002             | Web and mobile feature behavior diverges.                                                                              | HIGH        | HIGH     | Shared OpenAPI contracts, server-authoritative rules and cross-surface regression matrix.                                                                                                    | Mobile Tech Lead               | TASK-100B/TASK-100L           | OPEN               |
| MOB-RISK-003             | Existing APIs lack mobile-efficient or native lifecycle contracts.                                                     | HIGH        | HIGH     | OpenAPI gap inventory, generated client drift gate and owner-scoped contract tests before UI work.                                                                                           | API Lead                       | TASK-100B–TASK-100J           | OPEN               |
| MOB-RISK-004             | Financial charts exceed phone memory/frame budgets or lose semantic accuracy.                                          | MEDIUM      | HIGH     | Library spike, bounded datasets, pure fixture-tested transforms and physical-device baselines.                                                                                               | Mobile Tech Lead               | TASK-100B/TASK-100E/TASK-100K | OPEN               |
| MOB-RISK-005             | Session secrets are stored outside SecureStore or leak through backups/logs.                                           | MEDIUM      | CRITICAL | SecureStore-only token adapter, source/bundle/cache/log inspection and logout wipe tests.                                                                                                    | Security Lead                  | TASK-100D/TASK-100J           | OPEN               |
| MOB-RISK-006             | Push retries or token rotation deliver duplicate notifications.                                                        | MEDIUM      | HIGH     | Owner/device binding, idempotency key, receipt reconciliation, dedupe and replay tests.                                                                                                      | Notifications Lead             | TASK-100F                     | OPEN               |
| MOB-RISK-007             | Deep links bypass authentication or resource ownership checks.                                                         | MEDIUM      | CRITICAL | Typed allowlist, authenticate before resolve and server reauthorization for every target.                                                                                                    | Security Lead                  | TASK-100C/TASK-100J           | OPEN               |
| MOB-RISK-008             | Offline users mistake cached data for fresh market data.                                                               | HIGH        | HIGH     | Timestamped read-only cache, persistent stale/offline banners and foreground refetch without fake freshness.                                                                                 | Mobile Product Lead            | TASK-100J                     | OPEN               |
| MOB-RISK-009             | Tablet layouts become stretched phone layouts with unusable information density.                                       | MEDIUM      | MEDIUM   | Tablet portrait/landscape design variants, keyboard support and visual regression matrix.                                                                                                    | Design Systems Lead            | TASK-100C/TASK-100K           | OPEN               |
| TABLET_SUPPORT_DEFERRED  | Tablet-specific navigation, accessibility, visual regression and E2E are not part of mobile v1.                        | MEDIUM      | MEDIUM   | Do not advertise tablet production support; preserve responsive architecture; keep NavigationRail experimental; create v1.1 validation milestone; prevent tablet PASS claims in TASK-100L/R. | Product and Mobile Engineering | Mobile v1.1                   | ACCEPTED_FOR_V1    |
| ANDROID_SUPPORT_DEFERRED | Android native validation, TalkBack, visual regression, failure-state E2E and store release are not part of mobile v1. | MEDIUM      | HIGH     | Do not advertise Android production support; preserve source/config; isolate the iOS release path; complete Android gates in v1.1.                                                           | Product and Mobile Engineering | Mobile v1.1                   | ACCEPTED_FOR_V1    |
| MOB-RISK-010             | Mobile changes regress VoiceOver, TalkBack, dynamic type or focus order.                                               | MEDIUM      | HIGH     | Accessible primitives, manual screen-reader scripts, automated checks and zero-critical gate.                                                                                                | Accessibility Lead             | External manual validation    | ACCEPTED_EXCEPTION |
| MOB-RISK-011             | Native dependencies become unmaintained or incompatible with Expo/React Native.                                        | MEDIUM      | HIGH     | Compatibility/license/new-architecture review, adapter isolation and pinned upgrade policy.                                                                                                  | Mobile Platform Lead           | TASK-100B/TASK-100J           | OPEN               |
| MOB-RISK-012             | Client feature flags disagree with real provider capabilities.                                                         | HIGH        | HIGH     | Server-authoritative bootstrap/capability reason codes; mobile may disable but never enable.                                                                                                 | Platform Lead                  | TASK-100J                     | OPEN               |
| MOB-RISK-013             | Fixture/fake provider data is accidentally exposed as production data.                                                 | MEDIUM      | CRITICAL | Fail-closed composition, visible unavailable states, environment tests and fake-claim counter in TASK-100L.                                                                                  | Data Platform Lead             | TASK-100E/TASK-100J/TASK-100L | OPEN               |
| MOB-RISK-014             | Audit criteria are weakened through skips, rebaselines or missing-evidence exemptions.                                 | MEDIUM      | CRITICAL | Immutable candidate, zero skip/retry-only rule, 100% screenshot ledger and independent TASK-100L.                                                                                            | QA/Audit Lead                  | TASK-100K/TASK-100L           | CLOSED             |
| MOB-RISK-015             | External credentials, legal approval or staging access delay launch evidence.                                          | HIGH        | HIGH     | Keep external blockers explicit; do not convert local/sandbox evidence; schedule TASK-100R only after parity GO.                                                                             | Release Manager                | TASK-100R                     | OPEN               |

## Current assessment

Open risks: 13
Accepted/closed risks: 4
Critical-impact open risks: 3

This register does not assert that any mitigation has been implemented. Owners are accountable
roles, not named assignees.

TASK-100E evidence (2026-08-05): MOB-RISK-013 mitigation passed for the iOS production export.
Release-mode module resolution supplies empty capability data and the Hermes semantic scan found
zero deterministic market values, fixture labels or bypass identifiers. The broader risk remains
OPEN through TASK-100L because real provider credentials are still external blockers.

## TASK-100G update

Portfolio mobile adaptation is complete. Residual external risks are market, benchmark and corporate-action credentials. Production fake portfolio data remains zero; privacy/ownership/decimal/pagination controls passed. VoiceOver manual validation remains not executed under the documented user exception.

# TASK-100H risk addendum

- Real market, benchmark, fundamentals, and corporate-action providers remain `CREDENTIAL_REQUIRED`.
- Production backtests fail closed with `PROVIDER_REQUIRED`; deterministic fixtures are compile-time test-only.
- Point-in-time, survivorship, revision, ownership, experiment-bound, and telemetry-redaction controls are covered by automated tests.
- VoiceOver manual validation remains `NOT_EXECUTED`; the user accepted a documented TASK-100L transition exception.

# TASK-100I risk addendum

- Report generation now uses the attached BullMQ report worker; owner-bound file access and CSV formula protection are verified.
- Legal content remains `LEGAL_REVIEW_REQUIRED`; transactional support e-mail remains `SANDBOX_INTEGRATION`.
- Native secure file persistence, app-switcher privacy and expanded link/share hardening remain TASK-100J.
- VoiceOver manual validation remains `NOT_EXECUTED`; it is not reported as verified or PASS.

# TASK-100J risk addendum

- MOB-RISK-005: Keychain-only auth, reinstall marker, local-cache/file cleanup and redaction controls are implemented and tested; external release audit remains through TASK-100K/L.
- MOB-RISK-007: completed-module allowlist, bounded token consumption and owner reauthorization contracts pass; Universal Links remain `EXTERNAL_CONFIGURATION_REQUIRED`.
- MOB-RISK-008: offline/cache expiry/mutation-block states have native iOS evidence; the mutation queue is disabled.
- MOB-RISK-011: Expo SDK 57-compatible FileSystem/Crypto/ScreenCapture modules compile under the native iOS project.
- Production readiness remains `NO-GO`; external provider/APNs/e-mail/legal gates are unchanged.

# TASK-100K risk addendum — 2026-08-10

- `MOB-RISK-010` is an explicit `ACCEPTED_EXCEPTION` for TASK-100L transition: automated accessibility, Dynamic Type, Reduced Motion and native hierarchy checks pass, but Xcode 26.5 cannot run iOS VoiceOver in Simulator and no physical iPhone is attached for the human-operated session. The user authorized transition on 2026-08-10. This does not constitute manual VoiceOver PASS evidence or production approval.
- `MOB-RISK-014` is `CLOSED`: the 156-image visual gate, repository/security suites and the corrected full active Maestro inventory pass; current result is 160/160 with zero skip or retry-only flow.
- Market/benchmark/fundamentals/corporate-action providers, production APNs, universal-link association, transactional e-mail and legal review remain external blockers owned outside TASK-100K.
- Android and tablet remain `DEFERRED_TO_V1_1`; neither is added to the iOS v1 release gate.
- `Production Readiness: NO-GO`, `Staging Gate: DEFERRED_EXTERNAL_GATE`, and `Production Launch: BLOCKED` are unchanged.

# TASK-100L parity remediation addendum — 2026-08-11

| Risk                                         | Severity | Accepted by user | Verified                   | Blocker type                                                       | Target phase               | Evidence                                         | Owner/status                       |
| -------------------------------------------- | -------- | ---------------- | -------------------------- | ------------------------------------------------------------------ | -------------------------- | ------------------------------------------------ | ---------------------------------- |
| VoiceOver manual validation not executed     | HIGH     | YES              | NO                         | Documented TASK-100L transition exception; production risk remains | External manual validation | `mobile-voiceover-native-validation-result.md`   | Accessibility / ACCEPTED_EXCEPTION |
| Production mobile feature API composition    | CRITICAL | N/A              | YES_BY_CODE_AND_NATIVE_E2E | Closed parity risk; production queries now composed                | TASK-100L remediation      | `mobile-v1-final-gap-register.md` L-GAP-002..007 | Mobile Engineering / CLOSED        |
| Protected navigation and deep-link lifecycle | CRITICAL | N/A              | YES_BY_CODE_AND_NATIVE_E2E | Closed security/parity risk                                        | TASK-100L remediation      | L-GAP-001 and L-GAP-008                          | Mobile Platform / CLOSED           |
| Production-connected E2E evidence            | HIGH     | N/A              | YES                        | Closed evidence risk; supplemental production suite passes         | TASK-100L remediation      | TASK-100L production composition 2/2             | Mobile QA / CLOSED                 |
| Real market and analytical providers missing | HIGH     | NO               | EXTERNAL                   | External launch blocker                                            | External gate              | capability registry                              | Data Platform / OPEN_EXTERNAL      |
| Production APNs configuration missing        | HIGH     | NO               | EXTERNAL                   | External launch blocker                                            | External gate              | push security review                             | Mobile Platform / OPEN_EXTERNAL    |
| Universal-link association missing           | MEDIUM   | NO               | EXTERNAL                   | External launch blocker                                            | External gate              | deep-link security review                        | Platform / OPEN_EXTERNAL           |
| Transactional e-mail sandbox only            | MEDIUM   | NO               | EXTERNAL                   | External launch blocker                                            | External gate              | communication status                             | Communications / OPEN_EXTERNAL     |
| Legal review pending                         | HIGH     | NO               | EXTERNAL                   | External launch blocker                                            | External gate              | legal registry                                   | Legal / OPEN_EXTERNAL              |
| Android production support                   | MEDIUM   | YES_FOR_V1_SCOPE | NO                         | Deferred, not iOS v1 blocker                                       | Mobile v1.1                | scope decision                                   | Product / DEFERRED                 |
| Tablet production support                    | MEDIUM   | YES_FOR_V1_SCOPE | NO                         | Deferred, not iOS v1 blocker                                       | Mobile v1.1                | scope decision                                   | Product / DEFERRED                 |
