# Mobile Authentication

Mobile v1 uses the existing server session service. Web continues to receive strict secure
cookies. A request explicitly identified by `X-Atlas-Client: mobile` additionally receives the
opaque session credential, which is stored only in Expo SecureStore with
`WHEN_UNLOCKED_THIS_DEVICE_ONLY`. Passwords are never trimmed, logged, cached or persisted.

Session bootstrap states are initializing, unauthenticated, authenticated, onboarding-required,
reauthentication-required, locked and unavailable. Restore is single-flight. Unauthorized,
logout and account switch clear SecureStore, private query cache and registered device cleanup
hooks. Back navigation cannot restore the credential because route state never contains it.

Login and password reset use the shared typed client, safe error mapping, correlation identifiers
and enumeration-safe reset responses. Public registration and e-mail verification are not present
in the backend and therefore render explicit unavailable states. No fake account or delivery
flow is provided.

Legal status remains `LEGAL_REVIEW_REQUIRED`. VoiceOver remains
`ACCEPTED_PRODUCT_WAIVER` with production follow-up in TASK-100K.
