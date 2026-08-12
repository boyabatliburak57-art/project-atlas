# Mobile Deep-Link Security

The custom `atlas` scheme accepts only versioned, bounded targets: symbol, scanner result, watchlist, alert, portfolio, strategy, backtest, report and support. IDs are validated as uppercase symbol identifiers or UUIDs. Queries, fragments, credentials, extra path segments, unknown routes and URLs longer than 768 characters are rejected.

Every private destination passes authentication, verification/onboarding, feature/capability and backend ownership checks. A resource ID or push payload is never authorization. Deleted, expired and foreign-owner resources go to a safe fallback without showing cached content.

Verification/reset links use a separate bounded token parser. Tokens remain in memory only for immediate consumption; they are not logged, telemetered, cached, displayed or retained in navigation history. Used/expired links close safely.

Universal links and production Associated Domains are `EXTERNAL_CONFIGURATION_REQUIRED`; no false PASS is assigned. Custom schemes can be claimed by another application, so token and ownership validation remains backend-authoritative. Runtime links cannot change the API host or open an arbitrary internal route.
