# Mobile Onboarding

The authoritative checkpoint is `/me/preferences` and `/me/onboarding/*`, guarded by bearer
authentication and optimistic `expectedVersion`. Local state is only an in-memory UX draft;
offline mutations are not queued. The shared `@atlas/domain` step identifiers are disclosure,
market/locale/timezone, benchmark/profile, watchlist, scanner preset, notifications, demo choice
and summary.

Optional steps may be skipped; disclosure and summary may not. Progress is resumable across
devices because every checkpoint is server-backed. Completion is idempotent at the service
boundary, opens tabs and removes onboarding from back navigation. A 409 version conflict requires
refresh/reconciliation and never silently overwrites another device.

Watchlist/scanner choices do not run providers or show fake live prices. Demo resources remain
owner-scoped, deterministic, visibly DEMO-labelled and resettable.
