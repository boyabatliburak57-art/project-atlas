# Mobile Offline Feature Matrix

| Feature             | Cache Class         |                        Persisted |                 TTL | Offline Read            | Mutation | Logout Cleanup | Status |
| ------------------- | ------------------- | -------------------------------: | ------------------: | ----------------------- | -------- | -------------- | ------ |
| Authentication      | AUTH_SECRET         |                    Keychain only |      Session expiry | No                      | Blocked  | Yes            | PASS   |
| Market overview     | INTERNAL            |                               No |               5 min | Memory read-only        | Blocked  | Yes            | PASS   |
| Search              | USER_PRIVATE        |                               No |               5 min | Memory read-only        | Blocked  | Yes            | PASS   |
| Symbol detail       | INTERNAL            |                               No |               5 min | Memory read-only        | Blocked  | Yes            | PASS   |
| Scanner/saved scans | USER_PRIVATE        |                               No |               5 min | Memory read-only        | Blocked  | Yes            | PASS   |
| Watchlists/alerts   | USER_PRIVATE        |                               No |               5 min | Memory read-only        | Blocked  | Yes            | PASS   |
| Portfolio           | FINANCIAL_SENSITIVE |                               No |               5 min | Memory read-only/masked | Blocked  | Yes            | PASS   |
| Strategy/backtests  | FINANCIAL_SENSITIVE |                               No |               5 min | Memory read-only        | Blocked  | Yes            | PASS   |
| Reports             | FINANCIAL_SENSITIVE | No; validated temp artifact only | 5 min / file 15 min | Metadata/read-only      | Blocked  | Yes            | PASS   |
| Help/methodology    | PUBLIC              |                    Not currently |  Policy max 30 days | Memory read-only        | Blocked  | Optional       | PASS   |
| Settings            | USER_PRIVATE        |            No local server cache |               5 min | Local appearance only   | Blocked  | Yes            | PASS   |

Offline mutation queue: `DISABLED`. Expired data state: `EXPIRED_OFFLINE_CACHE`. Provider/freshness/evaluability states remain distinct.
