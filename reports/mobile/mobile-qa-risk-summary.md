# Mobile QA Risk Summary

| Risk                                            | Severity | Release blocker?        | Owner              | Target    | Evidence                                            | Status             |
| ----------------------------------------------- | -------- | ----------------------- | ------------------ | --------- | --------------------------------------------------- | ------------------ |
| Manual VoiceOver not executed                   | CRITICAL | NO by user exception    | Accessibility Lead | external  | user authorized transition; test remains unexecuted | ACCEPTED_EXCEPTION |
| Active historical Maestro auth contracts        | HIGH     | NO                      | Mobile QA          | TASK-100K | corrected current full-suite JUnit: 160/160 PASS    | CLOSED             |
| Backtest performance regression                 | HIGH     | NO                      | Performance Lead   | TASK-100K | uncontended PERF-BT-001..006 all PASS               | CLOSED             |
| Market/benchmark/fundamentals/corporate actions | HIGH     | External launch blocker | Data Platform      | external  | credential state                                    | OPEN_EXTERNAL      |
| Production APNs                                 | HIGH     | External launch blocker | Mobile Platform    | external  | release configuration                               | OPEN_EXTERNAL      |
| Universal-link association                      | MEDIUM   | External launch blocker | Platform           | external  | deployment association                              | OPEN_EXTERNAL      |
| Transactional e-mail                            | MEDIUM   | External launch blocker | Communications     | external  | sandbox integration                                 | OPEN_EXTERNAL      |
| Legal publication review                        | HIGH     | External launch blocker | Legal              | external  | legal registry status                               | OPEN_EXTERNAL      |
| Android/tablet                                  | MEDIUM   | No for iOS v1           | Product            | v1.1      | scope decision                                      | DEFERRED           |

The physical-device VoiceOver gap is visible as a user-accepted transition exception; it is not represented as verified PASS evidence. No other local failure is hidden by a waiver, skip, retry-only classification or threshold increase.
