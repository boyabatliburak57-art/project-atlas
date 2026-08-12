# Mobile Release Regression

Release regression targets iPhone 17 on iOS 26.5 in portrait-first mode. General landscape UI is `NOT_RELEASE_GATED`; rotation must not crash, corrupt modal state or bypass privacy. Android and tablet remain deferred to v1.1.

The run order is: freeze and compare existing visuals; run repository, mobile, API, pagination and security tests; execute every active Maestro flow; execute the consolidated critical suite; capture reviewed accessibility visuals; run an independent full diff; validate Expo config and production exports; scan for secrets, focused/skipped tests and production-accessible fixtures.

Authentication flows use the owner-scoped local E2E account created by `pnpm --filter @atlas/api e2e:seed:mobile-release`. The command requires `ATLAS_ENV=test`, `ATLAS_MOBILE_E2E_FIXTURE=1`, a loopback PostgreSQL URL and an explicit `ATLAS_MOBILE_E2E_PASSWORD`; it fails closed for production or remote databases. The fixture is not part of the mobile production bundle.

Crash accounting distinguishes current-candidate native crashes, JS fatal errors, unhandled critical errors, infinite loading and historical simulator crash artifacts. Network failure QA covers offline launch, mid-request loss, restoration, timeout, rate limiting, provider unavailability, partial data and stale cache without replaying mutations.

Production readiness remains `NO-GO`, staging remains `DEFERRED_EXTERNAL_GATE`, and production launch remains `BLOCKED` after local QA.
