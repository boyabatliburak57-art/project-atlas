# TASK-100I Reports, Help, Support and Settings Gap Analysis

Date: 2026-08-08

| Capability                                    | Backend        | Web                        | Mobile                     | External Dependency               | Security/Privacy                                 | Missing Work                       | Action                     |
| --------------------------------------------- | -------------- | -------------------------- | -------------------------- | --------------------------------- | ------------------------------------------------ | ---------------------------------- | -------------------------- |
| Report registry and owner-scoped CRUD         | BACKEND_READY  | BACKEND_READY              | MOBILE_ADAPTATION_REQUIRED | None                              | Owner-scoped cursor and audit                    | Typed mobile registry and states   | MOBILE_ADAPTATION_REQUIRED |
| Asynchronous report generation                | API_GAP        | Synchronous ready response | NOT_APPLICABLE             | Redis/BullMQ                      | Idempotency and terminal persistence             | Attach real report queue/worker    | API_GAP                    |
| Report file download                          | BACKEND_READY  | BACKEND_READY              | MOBILE_ADAPTATION_REQUIRED | TASK-100J file hardening          | 60-second HMAC URL, authenticated fetch          | Explicit share/download foundation | MOBILE_ADAPTATION_REQUIRED |
| PDF output                                    | API_GAP        | NOT_APPLICABLE             | NOT_APPLICABLE             | Renderer/object storage           | Active-content and accessibility review          | Keep unavailable; CSV only         | DEFERRED                   |
| CSV safety                                    | BACKEND_READY  | BACKEND_READY              | MOBILE_ADAPTATION_REQUIRED | None                              | Formula-injection neutralization                 | Surface supported format safely    | MOBILE_ADAPTATION_REQUIRED |
| Portfolio/scanner/backtest/experiment reports | BACKEND_READY  | BACKEND_READY              | MOBILE_ADAPTATION_REQUIRED | Market providers where applicable | Source ownership                                 | Mobile forms/detail surfaces       | MOBILE_ADAPTATION_REQUIRED |
| Help/versioned content                        | BACKEND_READY  | BACKEND_READY              | MOBILE_ADAPTATION_REQUIRED | None                              | Bounded redacted search                          | Mobile help/search/article         | MOBILE_ADAPTATION_REQUIRED |
| Methodology center                            | BACKEND_READY  | BACKEND_READY              | MOBILE_ADAPTATION_REQUIRED | Provider metadata                 | Version/cutoff disclosure                        | Unified mobile center              | MOBILE_ADAPTATION_REQUIRED |
| Legal registry                                | BACKEND_READY  | BACKEND_READY              | MOBILE_ADAPTATION_REQUIRED | Legal review                      | Never claim approval                             | Review-status surface              | LEGAL_REVIEW_REQUIRED      |
| Support request/history                       | BACKEND_READY  | BACKEND_READY              | MOBILE_ADAPTATION_REQUIRED | E-mail sandbox                    | Ownership, sanitization, internal-note isolation | Mobile form/history                | MOBILE_ADAPTATION_REQUIRED |
| Settings/preferences                          | BACKEND_READY  | BACKEND_READY              | MOBILE_ADAPTATION_REQUIRED | Providers/APNs/e-mail             | expectedVersion and rollback                     | Consolidated settings center       | MOBILE_ADAPTATION_REQUIRED |
| Personal data export                          | BACKEND_READY  | BACKEND_READY              | MOBILE_ADAPTATION_REQUIRED | TASK-100J file hardening          | Re-auth, ownership, expiry                       | Capability state and request entry | MOBILE_ADAPTATION_REQUIRED |
| Account deletion/legal hold                   | BACKEND_READY  | BACKEND_READY              | MOBILE_ADAPTATION_REQUIRED | Legal policy                      | Re-auth; legal hold preserved                    | Safe request/cancel entry          | MOBILE_ADAPTATION_REQUIRED |
| Native persistent secure files                | NOT_APPLICABLE | NOT_APPLICABLE             | DEFERRED                   | TASK-100J                         | Protected temporary lifecycle                    | Do not over-claim                  | DEFERRED                   |
| VoiceOver manual validation                   | NOT_APPLICABLE | NOT_APPLICABLE             | DEFERRED                   | TASK-100K                         | Existing waiver retained                         | Manual device validation           | DEFERRED                   |

## Account and delivery policy

- Public registration remains unavailable; accounts are invitation/admin managed.
- Transactional e-mail remains `SANDBOX_INTEGRATION`.
- Legal content remains `LEGAL_REVIEW_REQUIRED` and `NOT_FOR_PRODUCTION_PUBLICATION`.
- Market, benchmark, fundamentals, and corporate-action providers remain `CREDENTIAL_REQUIRED`.
- Android and tablet remain `DEFERRED_V1_1_NOT_RELEASE_GATED`.

## Remediation outcome

The table above is the required pre-implementation snapshot. TASK-100I closed the asynchronous generation and PDF gaps with `atlas.reports.v1`, the attached production worker, queued/running/ready persistence, SHA-256 artifact evidence and a bounded human-readable PDF renderer. Mobile adaptations for Reports, Help, Support and Settings are implemented. TASK-100J/TASK-100K and external provider/legal/e-mail items remain intentionally open.
