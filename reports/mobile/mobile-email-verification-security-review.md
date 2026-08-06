# Mobile E-mail Verification Security Review

- Raw token persistence/logging/telemetry/navigation cache: prohibited; database stores SHA-256 only.
- Entropy: 32 cryptographically random bytes encoded base64url.
- Expiry: 24 hours. Resend cooldown: 15 minutes plus shared auth abuse prevention.
- Resend revokes prior active tokens. Delivery failure revokes the newly issued token.
- Confirmation enforces token version, expiry, revocation, single-use atomic update and authenticated
  account context when present.
- Existing-account policy: trusted backfill to `created_at`; public registration remains unavailable.
- Server middleware blocks unverified sessions outside verification and logout routes.
- Delivery is `SANDBOX_INTEGRATION`; production adapter is fail-closed and remains an external blocker.
- Cross-user/foreign-account test is authored, but PostgreSQL execution is environment-blocked because
  `TEST_DATABASE_URL` is unavailable. It is not reported PASS.
- Production iOS export contains none of the prohibited test-inbox/bypass identifiers.
- Secret leakage and skipped/focused-test scans found 0 findings.

Final execution (2026-08-03): the PostgreSQL suite ran against an isolated `_test` database and
passed 14/14, including foreign-account rejection and concurrent confirmation. IDOR failures: 0.
Security result: `PASS`.
