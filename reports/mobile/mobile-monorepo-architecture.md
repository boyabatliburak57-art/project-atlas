# Mobile Monorepo Architecture

**Decision:** ADR-026  
**Runtime:** Expo SDK 57 / React Native 0.86 / React 19.2.3  
**Scope:** Architecture foundation; feature screens are placeholders

## Monorepo tree

```text
apps/mobile
├── app
│   ├── (auth)
│   ├── (onboarding)
│   ├── (tabs)       # home, markets, search, portfolio, more placeholders
│   ├── modal
│   ├── _layout.tsx
│   └── +not-found.tsx
├── src
│   ├── components
│   ├── config
│   ├── features/auth
│   ├── features/flags
│   ├── navigation
│   ├── notifications
│   ├── providers
│   ├── query
│   ├── services
│   ├── storage
│   ├── telemetry
│   ├── test
│   └── theme
├── scripts
├── .maestro
├── app.config.ts
└── eas.json

packages/api-client
packages/design-tokens
packages/financial-formatting
packages/telemetry
packages/validation            # existing; transport-safe validation remains reusable
```

`packages/mobile-ui` is deliberately deferred to TASK-100C because this task creates no component
library. Mobile does not import database, worker or server-only domain packages.

## Shared package boundaries

- `api-client`: platform-neutral fetch transport, safe error contract, auth credential port,
  cancellation, timeout, correlation/client/version/locale/timezone headers, cursor-compatible
  envelopes and bounded retry taxonomy.
- `design-tokens`: platform-neutral colors, spacing, radius, typography, motion, elevation and
  chart/financial semantic tokens. No DOM or React Native imports.
- `financial-formatting`: locale-aware TRY and signed percentage formatting.
- `telemetry`: provider-neutral event/span port, no-op/local-safe adapters and redaction.
- `validation`: existing package remains available; domain logic is not copied into mobile.

All packages expose TypeScript source through an exports map, use strict repository TypeScript,
lint/test/typecheck/build policies and avoid Node-only runtime dependencies.

## API client and OpenAPI boundary

The API already publishes OpenAPI at `/api/v1/openapi.json`, but no code generator existed.
TASK-100B introduces a typed transport client rather than hand-copying feature DTOs. Feature
response types will be generated or transport schemas will be added as endpoints are adopted; the
client's public envelopes/error model are the stable shared boundary. Existing web fetch modules
remain unchanged.

The client sends `X-Atlas-Client`, platform, app version, locale, timezone and request ID headers.
Bearer session values are obtained through a credential port and never logged. Backend internal
messages or stacks are not exposed; unsafe payloads map to a bounded safe message.

## Authentication/session model

The existing API issues opaque sessions and supports both secure cookies and bearer parsing.
Mobile uses the bearer form because native cookie/CSRF handling would add a cookie-jar boundary.
The API login response currently does not include the opaque token in JSON; it only sets an
HttpOnly cookie and returns user/role/expiry metadata. Therefore production native login cannot be
completed without a minimal, backward-compatible mobile session issuance contract in TASK-100D.
TASK-100B does not alter auth API behavior.

`AuthSessionController` provides restore, establish, logout, unauthorized expiration, foreground
restore and private-cache cleanup. Session secrets use `ExpoSecureStorage` with
`WHEN_UNLOCKED_THIS_DEVICE_ONLY`; failure is fail-closed and has no AsyncStorage/plaintext fallback.

## Navigation

Expo Router groups `(auth)`, `(onboarding)`, `(tabs)` and `modal` are present. Tabs are Home,
Markets, Search, Portfolio and More. Route files contain only placeholder presentation. Guard
logic maps anonymous → auth, incomplete onboarding → onboarding, completed user → tabs and admin
only when an authenticated role includes `admin`.

Deep links are allowlisted for symbol, alert, scan result, portfolio, backtest and report. Parsing
uses a schema, rejects arbitrary schemes/routes and retains a pending target through auth/
onboarding. Resource ownership must still be revalidated by the backend.

## Query/cache

TanStack Query uses 30-second client staleness, five-minute GC, bounded typed retries, online-only
mutations, reconnect/foreground refetch and no default offline mutation queue. Financial source
freshness is a separate server field. Private query keys require an ownership scope and all private
queries are cancelled/removed on logout or unauthorized response.

Full persistent read-only cache is deferred to TASK-100J.

## Feature flags

Fourteen initial mobile/provider capabilities fail closed with `BOOTSTRAP_REQUIRED` and version 0.
Backend bootstrap may enable only returned values; absent values remain disabled. Mobile flags do
not replace backend authorization, provider registry or kill switches. A mobile bootstrap endpoint
is an API gap for TASK-100J.

## Telemetry

The default composition is no-op and explicitly `productionConfigured: false`. The shared adapter
supports startup, route, API timing, handled/unhandled errors and network changes. Tokens, cookies,
passwords, portfolio values, transaction details, personal identifiers, search queries, provider
credentials and raw payloads are redacted. Crash/performance vendor selection remains open.

## Network, app state and notifications

NetInfo and React Native AppState adapters feed deterministic controllers. Foreground transitions
can restore auth and refetch active queries without duplicate listeners. Expo Linking,
Notifications and Local Authentication are behind narrow foundations. Push device registration,
token ownership and delivery remain TASK-100F/J.

## Provider order

```text
ErrorBoundary
→ SafeAreaProvider
→ TelemetryProvider
→ NetworkStatusProvider
→ QueryClientProvider
→ AuthSessionProvider
→ PreferencesProvider
→ FeatureFlagProvider
→ LocaleProvider
→ ThemeProvider
→ NotificationProvider
→ LinkingProvider
```

The current React root mounts the error, safe-area and query providers; remaining named providers
have deterministic foundation ports/controllers and are composed as their API contracts become
available. The order invariant is unit tested.

## Testing and CI

Vitest runs deterministic unit and integration suites with an in-memory SecureStore mock.
React Native Testing Library is pinned for component work beginning TASK-100C. A Maestro smoke flow
defines launch/auth/onboarding/tab assertions. The repository command performs a headless
route/config smoke contract; actual simulator execution is a separate CI environment gate.

Quality and production PR workflows run config validation, Expo Doctor, integration tests and E2E
contract smoke. Root Turbo lint/typecheck/test/build includes all new workspaces. Expo export
validates iOS/Android bundles without signing credentials.

## Open decisions

1. Product/legal approval of `com.atlasfinance.mobile`; it is a technical placeholder.
2. Final icon/splash assets and store metadata in TASK-100C/release work.
3. Backward-compatible mobile session issuance/refresh contract in TASK-100D.
4. Generated per-endpoint OpenAPI model strategy and drift snapshot before feature adoption.
5. Production push, crash and performance providers.
6. Universal/app-link domains and association files.
7. Native chart library after licensing/accessibility/performance spike.
8. Physical simulator/device Maestro execution environment.

No production or staging readiness is claimed.
