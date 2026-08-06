# Mobile E-mail Verification API Matrix

| Capability             | Contract                                | Security                                                                    | Tests                                    | Status                 |
| ---------------------- | --------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------- | ---------------------- |
| Status                 | `GET /auth/email-verification/status`   | authenticated account, masked e-mail                                        | OpenAPI PASS                             | IMPLEMENTED            |
| Resend                 | `POST /auth/email-verification/resend`  | authenticated account, 15-minute cooldown, global auth limiter              | OpenAPI/mobile PASS                      | IMPLEMENTED            |
| Confirm                | `POST /auth/email-verification/confirm` | hash-at-rest, 24-hour expiry, single use, version and account-context check | OpenAPI/mobile PASS                      | IMPLEMENTED            |
| Full access guard      | API middleware                          | verification precedes onboarding/application access                         | typecheck/lint PASS                      | IMPLEMENTED            |
| Delivery               | sandbox adapter                         | production fail-closed                                                      | compile PASS                             | SANDBOX_INTEGRATION    |
| PostgreSQL integration | migration `0023_email_verification`     | IDOR/concurrency test authored                                              | not executed: `TEST_DATABASE_URL` absent | BLOCKED_BY_ENVIRONMENT |

Public registration remains `NOT_AVAILABLE`. Accounts are invitation/admin managed. Migration
backfills existing accounts as trusted/verified; future invitation/admin creation may explicitly set
`emailVerifiedAt` to null.

Final execution (2026-08-03): PostgreSQL integration passed 14/14. The matrix status for PostgreSQL
integration is therefore `PASS`; status, resend, confirm and full-access guard are `PASS`.
