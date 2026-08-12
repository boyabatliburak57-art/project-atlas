# Mobile Help and Support Feature Matrix

| Capability                | Backend/content                | Mobile                          | Privacy                   | Tests            | Status              |
| ------------------------- | ------------------------------ | ------------------------------- | ------------------------- | ---------------- | ------------------- |
| Help categories/articles  | versioned registry             | landing/detail/related content  | no query telemetry        | component/E2E    | PASS                |
| Help search               | bounded content search         | debounce/cancel/empty/offline   | raw query redacted        | unit/E2E         | PASS                |
| Methodology center        | versioned methodology registry | 12 domains linked               | public methodology only   | component/E2E    | PASS                |
| Legal center              | technical registry             | review metadata shown           | no approved/final claim   | database/E2E     | PASS                |
| Support create            | owner-scoped API               | validation/consent/safe success | content telemetry blocked | database/E2E     | PASS                |
| Support history           | cursor API                     | status list/detail foundation   | cross-user safe fallback  | database/E2E     | PASS                |
| Production support e-mail | sandbox adapter                | sandbox status                  | no provider claim         | adapter contract | SANDBOX_INTEGRATION |
