# Mobile Data Classification

TASK-100J classifies mobile data before deciding whether it may be cached, logged, copied or shared. The executable registry is `apps/mobile/src/security/data-classification.ts`.

| Class                 | Examples                                                | Persistence                                   | App-switcher  | Telemetry          | Clipboard/share                       | Cleanup/retention                |
| --------------------- | ------------------------------------------------------- | --------------------------------------------- | ------------- | ------------------ | ------------------------------------- | -------------------------------- |
| `PUBLIC`              | Help, methodology, public legal metadata                | Allowed in bounded OS-protected cache         | Optional      | Aggregate only     | Explicit action                       | Up to 30 days                    |
| `INTERNAL`            | Capability/reason codes, static provider state          | Memory-first                                  | Mask          | Aggregate only     | Prohibited                            | At most 24 hours                 |
| `USER_PRIVATE`        | Watchlist names, scans, preferences, support metadata   | Memory-only in v1                             | Mask          | Content prohibited | Explicit, policy-dependent            | Logout; max 15 minutes in memory |
| `FINANCIAL_SENSITIVE` | Portfolio, transactions, strategies, backtests, reports | Memory-only except validated temporary export | Mask          | Prohibited         | Copy prohibited; confirmed share only | Logout; five-minute memory TTL   |
| `AUTH_SECRET`         | Session, reset/verification token                       | SecureStore/Keychain only                     | Mask          | Prohibited         | Prohibited                            | Expiry/logout/reinstall guard    |
| `DEVICE_SECRET`       | Push delivery token, installation secret                | Protected storage/backend only                | Mask          | Prohibited         | Prohibited                            | Revoke on logout/user switch     |
| `TEMPORARY_SENSITIVE` | Validated report/share file                             | Private cache directory only                  | Mask          | Prohibited         | Confirmed share only                  | 15 minutes/error/share/logout    |
| `DEMO_TEST_ONLY`      | Maestro and visual fixture content                      | Test/dev only                                 | Not user data | Prohibited         | Prohibited                            | Compile-out in production        |

SecureStore is not a bulk cache. Atlas does not introduce custom cryptography: where native protected persistence is not demonstrably available, sensitive bulk data remains memory-only. VoiceOver remains `ACCEPTED_PRODUCT_WAIVER`; hidden states must never expose their underlying values to accessibility APIs.
