# Mobile Settings Feature Matrix

| Section            | Existing contract            | Mobile                                     | Conflict/offline         | Security                        | Status |
| ------------------ | ---------------------------- | ------------------------------------------ | ------------------------ | ------------------------------- | ------ |
| Account            | auth/profile                 | verification, locale, timezone, logout     | read-only offline        | no public registration          | PASS   |
| Appearance         | preferences                  | theme/reduced motion                       | expectedVersion rollback | production safe                 | PASS   |
| Market/data        | preferences/capabilities     | market, benchmark, chart/freshness links   | provider aware           | backend authoritative           | PASS   |
| Notifications      | TASK-100F preferences        | linked center                              | permission separated     | security notifications separate | PASS   |
| Portfolio/Strategy | existing domain defaults     | links and supported defaults               | new configs only         | no formula duplication          | PASS   |
| Privacy            | privacy/demo/data operations | masking, clear/reset, export/delete states | no offline mutation      | legal hold preserved            | PASS   |
| Security           | existing auth controls       | biometric/reset/logout/verification        | fail closed              | advanced hardening deferred     | PASS   |
| Legal/About        | registries/app metadata      | review status and safe version info        | cached read-only         | debug exposure 0                | PASS   |
