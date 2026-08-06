# Mobile Notification Security

Notification payloads exclude tokens, session IDs, e-mail, user identity, portfolio values, alert AST,
provider payloads and credentials. Sensitive lock-screen content uses a generic summary and fetches
authorized detail after unlock.

Delivery deduplicates by event, user, device and channel. Retry cannot create a second notification.
Invalid tokens are revoked; sandbox and production APNs environments cannot share registrations.
Listener registration is idempotent and listeners are removed on logout/user switch.

Quiet hours use the user timezone, support overnight ranges and preserve the original event time.
Security notifications bypass deferral according to policy and cannot be disabled with ordinary alert
preferences. E-mail remains `SANDBOX_INTEGRATION`.

Test push intents and market fixtures are development/test-only, compile-time fail closed and cannot
be enabled by production URL, query, deep link or remote flag. No production credential belongs in
the repository.
