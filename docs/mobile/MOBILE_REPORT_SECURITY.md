# Mobile Report Security

## Ownership and files

Report creation verifies source ownership. List, detail, cancel, delete and download queries include owner scope. The worker rechecks owner scope and never treats a queue payload or resource ID as authorization. Artifact keys are opaque hashes and contain no e-mail or user identifier.

Download uses an authenticated endpoint with a one-minute HMAC-bound token containing report and user context. Signature comparison is constant-time; expiry and current ready state are revalidated. Old cached URLs do not reopen expired artifacts. Storage credentials never enter the mobile bundle.

## Export and share

CSV cells beginning with `=`, `+`, `-` or `@` are prefixed to prevent spreadsheet formula execution and quotes are escaped. Ready/owner/expiry/checksum checks precede download. Sensitive report sharing requires an explicit warning and user action. Tokens, long-lived signed URLs, raw portfolio data and provider payloads are excluded from telemetry and notification payloads.

## Isolation and follow-up

Deterministic report/support evidence is development-only through Metro compile-time redirection; production resolves an empty fail-closed module. URL/deep-link parameters cannot enable the fixture in production. Native file persistence, app-switcher privacy and expanded share/download hardening remain TASK-100J. PDF accessibility remains unclaimed; VoiceOver verification remains TASK-100K.
