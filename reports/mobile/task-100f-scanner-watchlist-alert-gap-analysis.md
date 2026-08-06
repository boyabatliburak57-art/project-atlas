# TASK-100F Scanner, Watchlist, Alert and Push Gap Analysis

Date: 2026-08-06

| Capability                      | Backend                      | Web            | Mobile                       | Provider Dependency             | Missing Work                                | Action                                 |
| ------------------------------- | ---------------------------- | -------------- | ---------------------------- | ------------------------------- | ------------------------------------------- | -------------------------------------- |
| Scanner AST/catalog             | BACKEND_READY                | BACKEND_READY  | MOBILE_ADAPTATION_REQUIRED   | Capability-aware                | Native builder and validation mapping       | Adapt existing versioned contracts     |
| Saved scans/revisions           | BACKEND_READY                | BACKEND_READY  | MOBILE_ADAPTATION_REQUIRED   | None for save                   | Saved/Create/History UI                     | Mobile adapter and screens             |
| Scan execution/results          | BACKEND_READY                | BACKEND_READY  | MOBILE_ADAPTATION_REQUIRED   | PROVIDER_REQUIRED               | Progress/results/provider states            | Native lifecycle surfaces              |
| Watchlists/items/reorder        | BACKEND_READY                | BACKEND_READY  | MOBILE_ADAPTATION_REQUIRED   | Prices require provider         | CRUD/detail UI                              | Adapt existing owner-scoped API        |
| Watchlist summary               | BACKEND_READY                | BACKEND_READY  | MOBILE_ADAPTATION_REQUIRED   | PROVIDER_REQUIRED               | Partial/provider state                      | Native summary surface                 |
| Alerts/revisions/history        | BACKEND_READY                | BACKEND_READY  | MOBILE_ADAPTATION_REQUIRED   | Evaluation requires provider    | Builder/lifecycle/history UI                | Adapt existing alert API               |
| Notification center/preferences | BACKEND_READY                | BACKEND_READY  | MOBILE_ADAPTATION_REQUIRED   | E-mail sandbox                  | Native center/preferences                   | Mobile adapter and UI                  |
| Quiet hours                     | BACKEND_READY                | BACKEND_READY  | MOBILE_ADAPTATION_REQUIRED   | None                            | Timezone-aware controls                     | Reuse worker policy contract           |
| iOS notification permission     | NATIVE_SERVICE_REQUIRED      | NOT_APPLICABLE | MOBILE_ADAPTATION_REQUIRED   | APNs external for live delivery | Pre-permission and adapter                  | Expo Notifications adapter             |
| Push device registration        | API_GAP                      | NOT_APPLICABLE | API_GAP                      | EXTERNAL_CREDENTIAL_REQUIRED    | Owner/install scoped register/rotate/revoke | Minimal OpenAPI-first API              |
| Push delivery/dedup             | BACKEND_READY                | NOT_APPLICABLE | MOBILE_ADAPTATION_REQUIRED   | EXTERNAL_CREDENTIAL_REQUIRED    | Push channel adapter contract               | Preserve dedup/quiet-hours pipeline    |
| Push deep links                 | BACKEND_READY                | NOT_APPLICABLE | MOBILE_ADAPTATION_REQUIRED   | None                            | Typed target parsing and ownership refresh  | Extend allowlist and client contract   |
| Production APNs delivery        | EXTERNAL_CREDENTIAL_REQUIRED | NOT_APPLICABLE | EXTERNAL_CREDENTIAL_REQUIRED | APNs/EAS credentials            | External release configuration              | Do not store credentials in repository |
| Android/tablet                  | DEFERRED                     | DEFERRED       | DEFERRED                     | Not applicable to v1            | v1.1 native validation                      | `DEFERRED_V1_1_NOT_RELEASE_GATED`      |

Public scanner results, live watchlist prices and alert evaluation remain provider-gated. Test data
is permitted only in development/test composition and must be absent from production bundles.
