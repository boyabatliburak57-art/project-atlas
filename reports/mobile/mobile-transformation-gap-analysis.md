# Project Atlas Mobile Transformation Gap Analysis

**Assessment date:** 2026-07-28  
**Evidence boundary:** Repository and local test artefacts only  
**Scope:** Planning baseline; no mobile implementation, dependency, migration or API change  
**Product position:** Mobile is the primary customer experience; web remains the desktop analytics,
advanced-workflow and administration surface; API and workers are shared platform services.

## Classification legend

- `BACKEND_READY`: an owner-scoped API/domain/worker capability exists and is reusable.
- `WEB_ONLY`: a user experience exists only in `apps/web`.
- `MOBILE_READY`: an existing contract can be consumed without domain duplication; no mobile UI is
  implied.
- `MOBILE_ADAPTATION_REQUIRED`: backend and/or web precedent exists, but native UX, lifecycle or
  contract adaptation is required.
- `MISSING`: no adequate repository capability was found.
- `EXTERNAL_PROVIDER_REQUIRED`: implementation must expose an unavailable/credential-required state
  until live provider evidence exists.

No feature is classified as a completed mobile feature because `apps/mobile` does not exist.

## Repository findings

The pnpm/Turborepo workspace contains `apps/web` (Next.js 16), `apps/api` (NestJS),
`apps/worker`, and shared `packages/config`, `database`, `domain`, `types`, and `validation`.
TypeScript 5.9, React 19, Zod 4, TanStack Query 5, Vitest and Playwright are already established.

Authentication uses opaque bearer sessions with hashed server-side tokens, expiry, idle expiry,
rotation, revocation, role claims and session-version invalidation. This is backend-ready, but the
web feature clients are hand-written `fetch` modules and there is no shared generated client.
OpenAPI is published and tested at `/api/v1/openapi.json`; typed-client generation is missing.

The web application has onboarding/preferences, market overview, symbol detail, scanner,
watchlists/alerts/notifications, portfolio/risk, Strategy Lab/backtests/experiments, reports,
activity, help, support, legal and admin operations. Playwright covers the major web workflows and
accessibility. There is no mobile visual catalog, native E2E harness, device matrix, push-token
model, background refresh, biometric gate, app-link association or mobile performance baseline.

## Feature matrix

| Feature                                | Backend                                                           | Web                                  | Mobile                       | Missing Work                                                             | Target Task |
| -------------------------------------- | ----------------------------------------------------------------- | ------------------------------------ | ---------------------------- | ------------------------------------------------------------------------ | ----------- |
| Product positioning and audit history  | `BACKEND_READY` unchanged                                         | `WEB_ONLY` retained                  | `MISSING`                    | Supersession record, plan and gates                                      | TASK-100A   |
| Monorepo/mobile runtime                | Shared pnpm/Turbo standards                                       | Next.js application                  | `MISSING`                    | Expo/Router/TS scaffold, environments, build profiles                    | TASK-100B   |
| OpenAPI typed client                   | OpenAPI document/test exists                                      | Hand-written feature clients         | `MOBILE_ADAPTATION_REQUIRED` | Generated shared client, auth/error/cursor adapters, drift CI            | TASK-100B   |
| Design tokens and financial formatting | Domain values exist                                               | CSS/component-local conventions      | `MISSING`                    | `design-tokens`, `mobile-ui`, `financial-formatting`; tr-TR/TRY policy   | TASK-100C   |
| Navigation and route guards            | Roles and owner context exist                                     | Global web shell/routes              | `MISSING`                    | Expo Router tabs/stacks, deep-link allowlist, admin guard                | TASK-100C   |
| Welcome and legal links                | Legal documents/consent APIs exist                                | Legal and onboarding surfaces        | `MISSING`                    | Mobile welcome, Investor/Analyst choice, safe legal states               | TASK-100D   |
| Authentication/session                 | `BACKEND_READY` opaque session lifecycle                          | Web login/session flows              | `MOBILE_ADAPTATION_REQUIRED` | SecureStore, rotation serialization, biometric local unlock, logout wipe | TASK-100D/J |
| Onboarding/preferences                 | `BACKEND_READY` preferences and consent                           | `WEB_ONLY` resumable flow precedent  | `MOBILE_ADAPTATION_REQUIRED` | Ten-step native flow, partial resume, push/biometric/demo choices        | TASK-100D   |
| Market overview                        | `BACKEND_READY` overview/read models                              | `WEB_ONLY` market workspace          | `MOBILE_ADAPTATION_REQUIRED` | Mobile cards, breadth/lists/sectors/status/freshness, refresh            | TASK-100E   |
| Futures and FX                         | `EXTERNAL_PROVIDER_REQUIRED`                                      | Capability-dependent/limited         | `MISSING`                    | Authoritative capability gate and safe unavailable state                 | TASK-100E/J |
| Market insight/research                | Internal methodology metadata is partial                          | Trust/market presentation exists     | `MOBILE_ADAPTATION_REQUIRED` | Source/date/methodology contract and non-chat presentation               | TASK-100E   |
| Global search                          | `BACKEND_READY` navigation search/cursor                          | `WEB_ONLY` global shell              | `MOBILE_ADAPTATION_REQUIRED` | Symbol/company/index/sector search, recent/favorites ownership           | TASK-100E   |
| Symbol detail                          | `BACKEND_READY` quote/signals/fundamentals/patterns/actions       | `WEB_ONLY` symbol workspace          | `MOBILE_ADAPTATION_REQUIRED` | Native detail tabs/actions/freshness and compact layouts                 | TASK-100E   |
| Advanced chart                         | Chart/overlay contracts and OHLCV exist                           | Web chart precedent                  | `MOBILE_ADAPTATION_REQUIRED` | Native candle/line/volume, gestures, crosshair, a11y summaries           | TASK-100E   |
| News                                   | `EXTERNAL_PROVIDER_REQUIRED`                                      | Internal insight may substitute      | `MISSING`                    | Provider gate; never synthesize fake news                                | TASK-100E   |
| Scanner catalog/presets                | `BACKEND_READY`                                                   | `WEB_ONLY` scanner workspace         | `MOBILE_ADAPTATION_REQUIRED` | Tabs, bottom-sheet filter builder, validation and preview                | TASK-100F   |
| Scan execution/results                 | `BACKEND_READY` worker/progress/cursor contracts                  | `WEB_ONLY` results                   | `MOBILE_ADAPTATION_REQUIRED` | Native progress, cursor list, matched conditions/actions                 | TASK-100F   |
| Watchlists                             | `BACKEND_READY`, owner-scoped                                     | `WEB_ONLY` workspace                 | `MOBILE_ADAPTATION_REQUIRED` | Multi-list CRUD/reorder/share policy and dual entry points               | TASK-100F   |
| Alerts                                 | `BACKEND_READY` evaluation/state/preferences                      | `WEB_ONLY` alerts/notifications      | `MOBILE_ADAPTATION_REQUIRED` | Native states, supported alert types, channel truthfulness               | TASK-100F   |
| Native push                            | Notification/outbox foundation only                               | In-app + sandbox e-mail              | `MISSING`                    | Device binding, token refresh/revoke, dedupe, deep links, quiet hours    | TASK-100F/J |
| Portfolio overview/ledger              | `BACKEND_READY`                                                   | `WEB_ONLY` portfolio workspaces      | `MOBILE_ADAPTATION_REQUIRED` | Native summary/allocation/positions/benchmark screens                    | TASK-100G   |
| Transactions                           | `BACKEND_READY` ledger/import APIs                                | `WEB_ONLY` transaction workflow      | `MOBILE_ADAPTATION_REQUIRED` | Locale-decimal forms and supported transaction taxonomy                  | TASK-100G   |
| Risk metrics                           | `BACKEND_READY` volatility/beta/Sharpe/drawdown/VaR/concentration | `WEB_ONLY` risk workspace            | `MOBILE_ADAPTATION_REQUIRED` | Mobile visualizations, methodology and stale handling                    | TASK-100G   |
| Strategy definitions                   | `BACKEND_READY` versioned domain/API                              | `WEB_ONLY` Strategy Lab              | `MOBILE_ADAPTATION_REQUIRED` | Native condition editor and cost/data-cutoff disclosures                 | TASK-100H   |
| Backtests                              | `BACKEND_READY` deterministic engine/worker/results               | `WEB_ONLY` result views              | `MOBILE_ADAPTATION_REQUIRED` | Mobile metrics, charts, trades, analysis and settings                    | TASK-100H   |
| Experiments                            | `BACKEND_READY` bounded grid/progress/results                     | `WEB_ONLY` experiment views          | `MOBILE_ADAPTATION_REQUIRED` | Native grid/progress/comparison; metric-based “best” copy                | TASK-100H   |
| Reports/export                         | `BACKEND_READY` owner-scoped cursor/download contracts            | `WEB_ONLY` report center             | `MOBILE_ADAPTATION_REQUIRED` | Native detail, expiry/warnings, share sheet and secure files             | TASK-100I   |
| Activity                               | `BACKEND_READY` cursor activity                                   | `WEB_ONLY` activity center           | `MOBILE_ADAPTATION_REQUIRED` | Mobile activity route and safe metadata                                  | TASK-100I   |
| Help/glossary/demo                     | Help catalog and demo reset APIs exist                            | `WEB_ONLY` help center               | `MOBILE_ADAPTATION_REQUIRED` | Native search/context/help and demo-reset confirmation                   | TASK-100I   |
| Support                                | `BACKEND_READY` owner/admin isolation                             | `WEB_ONLY` support lifecycle         | `MOBILE_ADAPTATION_REQUIRED` | Mobile create/list/detail and safe attachments                           | TASK-100I   |
| Settings/security/account              | Preferences, export/deletion/legal APIs exist                     | `WEB_ONLY` settings/legal            | `MOBILE_ADAPTATION_REQUIRED` | Mobile settings, deletion entry, app/build and native policies           | TASK-100I/J |
| Admin                                  | `BACKEND_READY` RBAC controls                                     | `WEB_ONLY` admin workspaces          | `MOBILE_ADAPTATION_REQUIRED` | Authorized-only visibility and server enforcement                        | TASK-100I/J |
| Feature flags                          | Versioned authoritative backend flags exist                       | Admin operational control            | `MOBILE_ADAPTATION_REQUIRED` | Mobile bootstrap/evaluation contract; no client override                 | TASK-100J   |
| Secure local storage                   | Session backend exists                                            | Browser storage model                | `MISSING`                    | SecureStore adapter; prohibit AsyncStorage tokens                        | TASK-100J   |
| Biometrics/app-state privacy           | None required server-side                                         | Not applicable                       | `MISSING`                    | Local unlock, fallback, privacy mask, screenshot policy                  | TASK-100J   |
| Offline/read-only cache                | Cache metadata/freshness exists server-side                       | Web query cache only                 | `MISSING`                    | Timestamped encrypted/read-only policy; prohibit unsafe mutations        | TASK-100J   |
| Network/background/update services     | Shared APIs only                                                  | Not applicable                       | `MISSING`                    | connectivity, app state, background refresh, version enforcement         | TASK-100J   |
| Crash/performance telemetry            | Shared observability/redaction conventions                        | Web/server telemetry                 | `MOBILE_ADAPTATION_REQUIRED` | Provider-neutral adapters, consent and secret-safe events                | TASK-100J   |
| Accessibility                          | API semantics; no mobile layer                                    | Playwright/axe and keyboard evidence | `MOBILE_ADAPTATION_REQUIRED` | VoiceOver/TalkBack, dynamic type, chart summaries, device matrix         | TASK-100K   |
| Mobile test automation                 | API integration suites are reusable                               | Playwright 38/38 historical audit    | `MISSING`                    | Unit, integration, E2E, visual and accessibility harnesses               | TASK-100K   |
| Mobile performance                     | API/local baselines exist                                         | Web/local baselines exist            | `MISSING`                    | Versioned physical-device class baselines; no staging claim              | TASK-100K   |
| Mobile feature-parity audit            | Existing audit patterns                                           | Web regression evidence              | `MISSING`                    | Zero-failure audit and screenshot coverage ledger                        | TASK-100L   |
| Cross-surface re-audit                 | Existing TASK-100 evidence                                        | Web/API/worker audit exists          | `MISSING`                    | Re-run only after TASK-100L GO; include mobile                           | TASK-100R   |

## Confirmed mobile architecture

`apps/mobile` will be an Expo managed-workflow React Native application using Expo Router,
TypeScript, TanStack Query, React Hook Form, Zod, SecureStore, Notifications, Local Authentication
and Linking. It will join the existing pnpm/Turbo workspace; creation is deferred to TASK-100B.
React/TypeScript/Zod/TanStack major compatibility must be resolved against the repository lockfile
during that task rather than guessed in this planning change.

Proposed dependency direction:

```text
apps/mobile
  -> packages/api-client
  -> packages/design-tokens
  -> packages/mobile-ui
  -> packages/financial-formatting
  -> packages/telemetry
  -> packages/validation (transport-safe schemas only)

apps/api -> packages/domain -> packages/database
apps/worker -> packages/domain -> packages/database
```

The mobile app must never import `packages/database`, server-only `packages/domain` internals, or
worker code. Domain rules remain authoritative behind APIs. `packages/api-client` is generated from
the checked OpenAPI document and wrapped only for transport, auth, cancellation, pagination,
sanitized errors and query-key policy. Generated code is not hand-edited, and OpenAPI drift fails
CI.

`packages/design-tokens` owns the specified color, spacing and radius primitives without React
Native imports. `packages/mobile-ui` owns accessible native presentation. Financial number/date/
decimal rules live in `packages/financial-formatting`. `packages/telemetry` exposes provider-neutral
redacted interfaces; it must not embed a vendor SDK in domain or API packages.

Feature/capability policy is server-authoritative. Mobile can hide or disable for presentation but
cannot enable a server-disabled capability. Unavailable responses include a stable reason code,
safe message and help target. Futures, FX, news, real-time, fundamentals, corporate actions and
production e-mail remain capability-gated; fixtures and sandbox adapters cannot support a
production claim.

## Navigation and data rules

The root route groups are `(onboarding)`, `(auth)`, `(tabs)` and authorized modal/detail stacks.
Tabs are Home, Markets, Search, Portfolio and More. Watchlists and alerts are reachable from both
Markets and More; Scanner is prominent under Search. Deep links resolve through a strict typed
allowlist, authenticate first, re-fetch owner-scoped resources, and never trust role/user/resource
claims from URL parameters.

TanStack Query owns server state. Offline data is read-only, timestamped and visibly stale.
Financial mutations fail closed offline unless a later task introduces an explicitly idempotent,
user-visible queue; this transformation does not authorize such a queue. SecureStore holds session
secrets. AsyncStorage may hold only non-sensitive preferences/cache indexes after security review.

## Open decisions and required proofs

1. Select the native financial chart library only after gesture, accessibility, new-architecture,
   licensing, tablet and performance spikes in TASK-100B/E.
2. Decide whether cached financial payloads require application-level encryption in addition to OS
   file protection; default is minimum-data, read-only cache.
3. Define iOS screenshot policy and Android secure-window behavior per sensitive screen; blanket
   blocking is not assumed.
4. Choose push, crash and performance providers through adapters; no production provider is
   implied by Expo development services.
5. Confirm universal/app-link domains and association files when deployment domains are available.
6. Extend API contracts for push-device binding, mobile bootstrap/capabilities, recent/favorite
   search, and version enforcement only in their owning implementation tasks.
7. Establish Storybook React Native or an equivalent repository-compatible visual catalog in
   TASK-100C.

## Estimated repository impact

Expected future changes are limited to `apps/mobile`, new shared client/token/UI/formatting/
telemetry packages, mobile build/test configuration, OpenAPI contract generation, push-device and
mobile-bootstrap API/database work, notification worker delivery, feature flags, CI scripts and
mobile reports. Existing `apps/web`, `apps/api`, `apps/worker`, domain, security and audit systems
remain in place and receive only shared-platform extensions with regression coverage.

## Current decision

The platform is suitable for a mobile-first transformation, but mobile parity does not exist.
Production Readiness remains `NO-GO`; Staging Gate remains `DEFERRED_EXTERNAL_GATE`; Production
Launch remains `BLOCKED`.
