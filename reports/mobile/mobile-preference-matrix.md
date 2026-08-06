# Mobile Preference Matrix

| Preference                         | Source                 | Server Backed          | Local Cache        | Conflict Policy            | Tests        | Status          |
| ---------------------------------- | ---------------------- | ---------------------- | ------------------ | -------------------------- | ------------ | --------------- |
| Theme                              | system/user preference | yes                    | UX only            | expectedVersion + rollback | component    | FOUNDATION_PASS |
| Locale                             | preferences API        | yes                    | header projection  | 409 reconciliation         | unit/API     | PASS            |
| Timezone                           | preferences API        | yes                    | header projection  | IANA validation + 409      | unit/API     | PASS            |
| Market/benchmark                   | preferences API        | yes                    | query seed only    | 409 reconciliation         | unit/API     | PASS            |
| Number/timeframe                   | preferences API        | yes                    | display projection | rollback                   | unit         | PASS            |
| Notifications/quiet hours          | preferences APIs       | yes                    | none authoritative | timezone-aware 409         | API existing | PASS            |
| Biometrics                         | SecureStore/local auth | local security setting | SecureStore        | reauthentication required  | unit         | PASS            |
| Reduced motion/compact/methodology | preferences API        | yes                    | render projection  | rollback                   | unit         | PASS            |
| Onboarding reset                   | onboarding API         | yes                    | none authoritative | expectedVersion            | integration  | PASS            |
