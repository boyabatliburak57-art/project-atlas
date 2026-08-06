# Mobile Push Security Review

Date: 2026-08-06

| Control                     | Evidence                                             | Result               |
| --------------------------- | ---------------------------------------------------- | -------------------- |
| Token storage               | AES-256-GCM ciphertext; SHA-256 fingerprint          | PASS                 |
| Raw token API/log/telemetry | service contract and production scan                 | PASS — 0 occurrences |
| Ownership                   | user + installation scoped register/rotate/revoke    | PASS                 |
| Logout/user switch          | revoke-all cleanup contract                          | PASS                 |
| Payload minimization        | allowlisted kind + opaque UUID + safe correlation    | PASS                 |
| Destination authorization   | auth/onboarding/feature/owner recheck                | PASS                 |
| Dedup                       | event/user/device/channel key                        | PASS                 |
| Test harness                | `__DEV__`, production resolver, export semantic scan | PASS                 |
| IDOR                        | foreign installation/target tests                    | PASS — 0 failures    |

`Production APNs Credential: EXTERNAL_CONFIGURATION_REQUIRED` and
`Live Production Push Delivery: NOT_VALIDATED`. No credential was added to the repository.
