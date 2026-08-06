# Mobile Push Notifications

Push permission is requested only after an in-app explanation. The client models `notDetermined`,
`granted`, `denied`, `provisional` and `unavailable`, does not repeatedly prompt after denial, and
offers the system-settings path.

Expo Notifications supplies the iOS client adapter. Device registration is owner and installation
scoped and records environment, minimized device metadata, locale, timezone and permission. Tokens
are encrypted at rest with AES-256-GCM and indexed only by SHA-256 fingerprint; API responses, logs
and telemetry never contain raw tokens. Rotation revokes the previous material. Logout and user
switch invoke owner-scoped revoke-all cleanup.

Supported intents are symbol, alert, scan result and watchlist. Payloads contain a safe notification
type, resource type, opaque resource ID and privacy-safe correlation ID. Authentication, onboarding,
feature and ownership checks run again after open; the payload is never authorization.

Client integration, registration and delivery contracts are implemented. Production APNs credentials
remain `EXTERNAL_CONFIGURATION_REQUIRED`; live production delivery is `NOT_VALIDATED`.
