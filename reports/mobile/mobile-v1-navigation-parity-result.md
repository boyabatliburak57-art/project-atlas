# Mobile v1 Navigation Parity Result

Audit date: `2026-08-11`  
Candidate: `fac5bfe45c2f + source-sha256:3c07165f2692e4a3c5498b53483e31325f19d802380fcf9a0443ff5e9dc0736c`  
Result: `PASS`

| Feature               | Entry Point         | Route                                  | Guard                    | Back Path | Deep Link               | Status                     |
| --------------------- | ------------------- | -------------------------------------- | ------------------------ | --------- | ----------------------- | -------------------------- |
| Welcome/auth          | Root                | `/welcome`, `/(auth)/*`                | Public-route allowlist   | Safe root | verification/reset      | IMPLEMENTED_AND_VALIDATED  |
| Onboarding            | Post-login          | `/(onboarding)`                        | Auth + server checkpoint | Auth/home | deferred continuation   | IMPLEMENTED_AND_VALIDATED  |
| Home/market           | Bottom tab          | `/(tabs)/home`                         | Auth + onboarding        | Tab       | N/A                     | IMPLEMENTED_PROVIDER_GATED |
| Markets               | Bottom tab          | `/(tabs)/markets`                      | Auth + onboarding        | Tab       | symbol                  | IMPLEMENTED_PROVIDER_GATED |
| Search                | Bottom tab          | `/(tabs)/search`                       | Auth + onboarding        | Tab       | symbol                  | IMPLEMENTED_PROVIDER_GATED |
| Symbol detail         | Search/market       | `/symbol/[symbol]`                     | Auth + schema            | Back      | allowlisted symbol      | IMPLEMENTED_PROVIDER_GATED |
| Scanner               | More                | `/scanner`                             | Auth + onboarding        | More      | owned scan run          | IMPLEMENTED_PROVIDER_GATED |
| Watchlists/alerts     | More/market         | `/watchlists`                          | Auth + onboarding        | More      | ownership checked       | IMPLEMENTED_AND_VALIDATED  |
| Notification Center   | More                | `/notifications`                       | Auth + onboarding        | More      | destination revalidated | IMPLEMENTED_AND_VALIDATED  |
| Portfolio/risk        | Bottom tab          | `/(tabs)/portfolio`, `/portfolio-risk` | Auth + owner             | Tab       | ownership checked       | IMPLEMENTED_PROVIDER_GATED |
| Strategy/backtests    | More                | `/strategies`                          | Auth + owner             | More      | ownership checked       | IMPLEMENTED_PROVIDER_GATED |
| Reports/help/settings | More                | `/reports`                             | Auth + owner             | More      | ownership checked       | IMPLEMENTED_PROVIDER_GATED |
| Preferences           | Settings/onboarding | `/preferences`                         | Auth in production       | Back      | N/A                     | IMPLEMENTED_AND_VALIDATED  |
| Native security       | Settings            | `/security`                            | Auth + app lock          | Back      | no arbitrary route      | IMPLEMENTED_AND_VALIDATED  |

Dead routes: `0`  
Unreachable required features: `0`  
Protected feature bypasses: `0`  
Broken back-navigation paths: `0`

`AppRouteGuard` owns auth/verification/onboarding ordering. Cold-launch normalization is handled by `+native-intent`; warm links use the same allowlist. Private resource links are fetched with the authenticated client before navigation, and deferred targets are revalidated after login/onboarding.
