# Mobile Onboarding Feature Matrix

| Step                   | Backend               | Mobile UI         | Validation                          | Resume | Skip | Tests                  | Status                          |
| ---------------------- | --------------------- | ----------------- | ----------------------------------- | ------ | ---- | ---------------------- | ------------------------------- |
| Disclosure/legal       | preferences + legal   | implemented       | shared/domain + published-only      | yes    | no   | unit                   | PASS_WITH_LEGAL_REVIEW_REQUIRED |
| Locale/timezone/market | preferences           | implemented       | tr-TR, IANA, BIST                   | yes    | yes  | unit/API               | PASS                            |
| Benchmark/profile      | preferences           | implemented       | XU100; profile is not authorization | yes    | yes  | unit                   | PASS                            |
| Watchlist start        | watchlist ownership   | choice foundation | no live-price fixture               | yes    | yes  | API IDOR existing      | FOUNDATION_PASS                 |
| Scanner preset         | scanner capability    | choice foundation | immutable choice; no run            | yes    | yes  | unit                   | FOUNDATION_PASS                 |
| Notifications          | preferences           | implemented       | security channel protected          | yes    | yes  | unit                   | FOUNDATION_PASS                 |
| Biometrics/demo        | local auth + demo API | implemented       | explicit consent; owner scope       | yes    | yes  | unit/API IDOR existing | PASS                            |
| Summary/complete       | onboarding complete   | implemented       | expectedVersion                     | yes    | no   | integration            | PASS                            |

Server step contract contains eight authoritative checkpoints; the requested presentation choices
are grouped into those checkpoints without duplicating the domain model.
