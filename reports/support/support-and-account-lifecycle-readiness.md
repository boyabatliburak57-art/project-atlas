# TASK-099 Support and Account Lifecycle Readiness

**Decision: PASS — local product completion evidence**

**Production Readiness: NO-GO**  
**Staging Gate: DEFERRED_EXTERNAL_GATE**  
**Product Development: CONTINUE**

This report records repository and local PostgreSQL evidence only. It does not
represent staging evidence and does not change TASK-080.

## Delivered

- Owner-scoped support create, list, detail, timeline and additional-message
  APIs with reference/correlation IDs.
- `bugReport`, `featureFeedback`, `dataIssue`, `accountSupport`,
  `securitySupport`, and `other` request types. Billing is absent from the
  product and therefore is not exposed.
- Full support status vocabulary, resolved-request reopen policy, admin queue,
  assignment, optimistic version control, user-visible response, internal
  note, correction link, audit and internal SLA metadata.
- Data-issue fields cover symbol, timeframe, date range, data type,
  expected/observed values and safe attachment linkage.
- `/support` user workspace, `/admin/support` operations queue, global
  navigation, contextual help, export and account-deletion education.
- Existing account export, deletion grace period, retention/purge and
  notification runtimes remain unchanged and regression-covered.

## Persistence and attachment security

Migration `0021_lazy_leo.sql` adds `support_requests`,
`support_request_events`, and `support_attachment_references`.

Attachment references accept only PNG, JPEG, or PDF metadata up to 5 MiB with
a SHA-256 checksum. The server generates an opaque owner/request-scoped object
key; user paths are never accepted or incorporated. Filename traversal and
control characters are rejected. The malware-scanning interface is mandatory;
the current metadata adapter leaves new objects `pending`, so they are not
represented as downloadable or clean before a production scanner reports a
terminal result. HTML/script content is not accepted or rendered.

## Security

- User queries include authenticated owner predicates; foreign request IDs
  return the same safe 404 response.
- Operations routes require a recently authenticated `operations_admin`.
- Admin writes require `expectedVersion` and a reason.
- Internal notes are excluded at the database query boundary from user
  timelines and normal activity surfaces.
- Support creation is rate limited to five requests per user/minute in
  addition to the global abuse-prevention middleware.
- The APIs use bearer authentication and do not use ambient cookie authority;
  cookie-authenticated requests remain subject to the existing session CSRF
  middleware.
- Support descriptions, attachment bytes, secrets and security-support detail
  are not copied into audit or notification metadata.

## Acceptance evidence

| Requirement             | Evidence                                              | Result |
| ----------------------- | ----------------------------------------------------- | ------ |
| Create support request  | PostgreSQL API integration                            | PASS   |
| List/detail ownership   | Owner predicates and cross-user 404                   | PASS   |
| Timeline                | Created/message/status events                         | PASS   |
| Data issue              | Strict structured schema                              | PASS   |
| Attachment validation   | MIME, size, checksum and scan state                   | PASS   |
| Oversized/invalid file  | 400 integration assertion                             | PASS   |
| Arbitrary path guard    | Traversal rejection and opaque-key assertion          | PASS   |
| Admin assignment/status | RBAC and optimistic update integration                | PASS   |
| Internal note isolation | User response excludes internal marker                | PASS   |
| User-visible response   | Timeline and notification integration                 | PASS   |
| Correction request link | Versioned admin event                                 | PASS   |
| Rate limit              | Sixth request receives 429                            | PASS   |
| CSRF                    | Bearer-only API plus existing cookie CSRF middleware  | PASS   |
| IDOR                    | Detail/message foreign owner tests                    | PASS   |
| Export lifecycle        | Existing report create/download/expiry regression     | PASS   |
| Deletion lifecycle      | Existing security and recovery integration            | PASS   |
| Notification delivery   | User-visible admin update notification                | PASS   |
| Retention               | Existing retention-v1 and deletion purge tests        | PASS   |
| Audit                   | User/admin support audit assertions                   | PASS   |
| Playwright E2E          | User/data issue/account lifecycle/admin/accessibility | PASS   |

## Account lifecycle policy

The UX links data export to the report center and exposes the versioned account
deletion/export notice. Deletion continues to require authenticated,
idempotent initiation, revokes sessions, disables the account, records a
30-day grace deadline, supports the existing operational cancellation path,
reports purge states, respects legal hold/retention policy, and emits lifecycle
notifications. The support route remains the recovery contact during the grace
period.

## Deferred external gates

The production malware scanner and object-storage upload transport are adapter
boundaries and require deployment credentials; local metadata tests do not
claim these as staging evidence. This does not block the TASK-099 local product
completion gate because unsafe or unscanned objects cannot become available.

## Verification summary

- Repository unit tests: 731/731 passed.
- Database migration/integration: 65/65 passed.
- API database integration: 49/49 passed; TASK-099 support/lifecycle 8/8.
- Full Playwright: 38/38 passed with four normal workers and no retries;
  TASK-099 2/2, automated WCAG A/AA findings 0.
- Format, ADR validation, lint, typecheck and production build: passed.
