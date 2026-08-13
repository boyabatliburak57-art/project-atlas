# Project Atlas Roadmap

## BIST Investment Research & Market Intelligence Expansion

```text
Milestone: BIST Intelligence Expansion
Task Range: TASK-110A–TASK-110S
Scope Expansion: APPROVED_AND_DOCUMENTED
TASK-100R: SUPERSEDED_BY_BIST_INTELLIGENCE_EXPANSION
Production Readiness: NO-GO
Staging Gate: DEFERRED_EXTERNAL_GATE
Production Launch: BLOCKED
```

Atlas expands the existing mobile baseline into one connected BIST research platform covering
market/company/event/institutional intelligence, scanners, portfolio analytics and strategy
research. This is an expansion, not a replacement. Broker, order-routing, trade-execution and
investment-advice capabilities remain out of scope.

Sequence:

1. TASK-110A — BIST Intelligence Expansion and Audit Supersession
2. TASK-110B — Information Architecture & Navigation V2
3. TASK-110C — BIST Intelligence Data Architecture
4. TASK-110D — KAP & Corporate Event Intelligence
5. TASK-110E — Institutional Intelligence
6. TASK-110F — BIST Market Structure & Restrictions
7. TASK-110G — Calendar & Event Center
8. TASK-110H — Company Intelligence & Compare
9. TASK-110I — Scanner / Radar 2.0
10. TASK-110J — Funds & Institutional Ownership
11. TASK-110K — VIOP Analytics
12. TASK-110L — Advanced Charts & Workspaces
13. TASK-110M — Atlas Intelligence Layer
14. TASK-110N — Unified Alerts & Smart Inbox
15. TASK-110O — Cross-Module Intelligence
16. TASK-110P — UX Simplification Audit
17. TASK-110Q — Accessibility / Performance / QA
18. TASK-110R — Expanded Feature-Parity Audit
19. TASK-110S — Re-run Non-Staging Launch Completeness Audit

Every dependency is sequential. TASK-100A–TASK-100L remain the existing-functionality baseline;
preserved TASK-100R evidence is historical and cannot satisfy TASK-110R or TASK-110S.

## Mobile v1.1 — Android and Tablet Expansion

- Android productionization, Maestro E2E and failure-state validation
- TalkBack accessibility and Android visual regression
- Android notification and deep-link validation
- Small and large phone profile validation
- Native tablet validation
- NavigationRail productionization
- Tablet portrait and landscape layouts
- Tablet VoiceOver/TalkBack and hardware keyboard navigation
- Tablet split-view workflows
- Tablet visual regression and E2E
- Android and tablet store support

## Mobile-First Product Transformation

This milestone is retained as the existing mobile baseline and is superseded for final audit scope
by the BIST Intelligence Expansion above.

```text
Milestone: Mobile-First Product Transformation
Task Range: TASK-100A–TASK-100L
Re-Audit: TASK-100R
Product Strategy: MOBILE_FIRST
Primary Customer Surface: MOBILE_APPLICATION
Desktop Surface: ADVANCED_ANALYTICS_AND_ADMIN
Backend Platform: SHARED_API_AND_WORKERS
Production Readiness: NO-GO
Staging Gate: DEFERRED_EXTERNAL_GATE
Production Launch: BLOCKED
```

Project Atlas is now a BIST-focused professional mobile financial application for market analysis,
scanner, alerts, portfolio/risk management, financial-data analysis and strategy backtesting.
Mobile is the primary customer experience. The existing web application remains the advanced
desktop analytics, large table/chart, advanced strategy editing, operations and administration
surface. API and workers remain the shared backend platform.

Sequence:

1. TASK-100A — Mobile Scope Change and Audit Supersession
2. TASK-100B — Mobile Architecture and Monorepo Setup
3. TASK-100C — Mobile Design System and Navigation
4. TASK-100D — Mobile Authentication, Onboarding and Preferences
5. TASK-100E — Market Overview, Search and Symbol Detail
6. TASK-100F — Scanner, Watchlists, Alerts and Push Notifications
7. TASK-100G — Portfolio and Risk Mobile Experience
8. TASK-100H — Strategy Lab, Backtests and Experiments
9. TASK-100I — Reports, Help, Support and Settings
10. TASK-100J — Offline, Security and Native Platform Services
11. TASK-100K — Mobile Accessibility, Performance and QA
12. TASK-100L — Mobile Feature-Parity Audit
13. TASK-100R — Re-run Non-Staging Launch Completeness Audit

```text
TASK-100A
→ TASK-100B
→ TASK-100C
→ TASK-100D
→ TASK-100E
→ TASK-100F
→ TASK-100G
→ TASK-100H
→ TASK-100I
→ TASK-100J
→ TASK-100K
→ TASK-100L
→ TASK-100R
```

TASK-100R is blocked until TASK-100L returns `GO_FOR_TASK_100_REAUDIT`. The previous statement that
a native mobile application was outside v1.0 is retained below as historical scope-freeze context
and is superseded by this approved milestone.

## v1.0 — Product completion and pre-staging validation

Status: `scope:frozen`

Sequence:

1. TASK-081 — staging gate deferral record
2. TASK-082 — scope freeze and backlog triage
3. TASK-083 — onboarding and preferences
4. TASK-084 — global navigation, search and activity
5. TASK-085 — unified report center
6. TASK-086 — accessibility, localization and responsive polish
7. TASK-087 — trust, methodology and disclosure surfaces
8. TASK-088 — local performance and resilience polish
9. TASK-089 — local pre-staging release candidate
10. TASK-090 — pre-staging product completion audit

TASK-090 can produce readiness for staging validation, not production approval.

## External production-readiness gate

```text
Production Readiness: NO-GO
Staging Gate: DEFERRED_EXTERNAL_GATE
Production Launch: BLOCKED
```

TASK-080S/TASK-080P must be reopened only when real staging access and authorization exist. Local tests,
containers, load or historical DAST artifacts are not staging evidence.

## v1.1+

The following remain outside v1.0:

- broker connections and live trading/order routing
- native mobile application
- social/community and public strategy marketplace
- AI investment recommendations
- tick-level/HFT simulation and unbounded optimization
- enterprise billing

Moving any item into v1.0 requires the change-control process in `reports/v1-scope-freeze.md`.
