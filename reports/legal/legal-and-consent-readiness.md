# Legal Documents, Consent and Disclosures Readiness

Status: TECHNICALLY_READY_LEGAL_REVIEW_REQUIRED

Assessment date: 2026-07-26  
Task: TASK-097

## Decision

The versioned legal-document, consent, re-consent, publication-control, audit,
and disclosure surfaces are technically ready. No repository document has
evidence of actual legal-counsel approval. All seven seeded documents therefore
remain `legalReviewRequired` and contain only:

```text
LEGAL_REVIEW_REQUIRED
NOT_FOR_PRODUCTION_PUBLICATION
```

No legal-compliance claim is made. No seeded document is approved, published,
or production-publication ready.

Production Readiness remains `NO-GO`. The staging gate remains
`DEFERRED_EXTERNAL_GATE`.

## Document readiness

| Document                                | Content status                                         | Technical readiness | Legal review status   | Production publication status  |
| --------------------------------------- | ------------------------------------------------------ | ------------------- | --------------------- | ------------------------------ |
| Terms of Use                            | Safe placeholder                                       | READY               | LEGAL_REVIEW_REQUIRED | NOT_FOR_PRODUCTION_PUBLICATION |
| Privacy Notice                          | Safe placeholder                                       | READY               | LEGAL_REVIEW_REQUIRED | NOT_FOR_PRODUCTION_PUBLICATION |
| Investment Risk Disclosure              | Safe placeholder                                       | READY               | LEGAL_REVIEW_REQUIRED | NOT_FOR_PRODUCTION_PUBLICATION |
| Data Source and Methodology Notice      | Safe placeholder                                       | READY               | LEGAL_REVIEW_REQUIRED | NOT_FOR_PRODUCTION_PUBLICATION |
| Acceptable Use Policy                   | Safe placeholder                                       | READY               | LEGAL_REVIEW_REQUIRED | NOT_FOR_PRODUCTION_PUBLICATION |
| Cookie/Consent Notice                   | Safe placeholder; withdrawal supported when applicable | READY               | LEGAL_REVIEW_REQUIRED | NOT_FOR_PRODUCTION_PUBLICATION |
| Account Deletion and Data Export Notice | Safe placeholder                                       | READY               | LEGAL_REVIEW_REQUIRED | NOT_FOR_PRODUCTION_PUBLICATION |

## Data model and migration

Migration `0019_dusty_puma.sql` adds:

- `legal_documents`
- `user_document_consents`

Document identity is unique by document type, version, and locale. Status is
restricted to `draft`, `legalReviewRequired`, `approved`, `published`, or
`retired`. Approval requires a reviewer, review timestamp, and external review
reference. Publication additionally requires an effective date, publisher, and
publication timestamp.

A PostgreSQL trigger prevents content, hash, type, version, locale, effective
date, review evidence, or publication evidence from changing after publication.
A retired version cannot be reactivated.

Consent records preserve user, document ID, document type, version, locale,
content hash, source, action, and timestamp. A new document version does not
modify prior consent history.

## Re-consent policy

- Only the latest effective published version of each type is presented.
- A latest version marked as a material change requires consent when that exact
  immutable document ID has not been accepted.
- Acceptance of an older version remains in history but does not satisfy a
  newer material version.
- Consent submission is idempotent for the same user/document/action.
- Withdrawal is supported only for the optional cookie/consent notice.
  Mandatory security, risk, terms, privacy, and account-lifecycle records cannot
  be incorrectly withdrawn through this endpoint.

## API and UI surfaces

User/public:

- `GET /api/v1/legal/documents`
- `GET /api/v1/legal/documents/{type}`
- `POST /api/v1/legal/consents`
- `POST /api/v1/legal/consents/withdraw`
- `GET /api/v1/me/consents`

Administration:

- `GET /api/v1/admin/legal/documents`
- `POST /api/v1/admin/legal/documents`
- `POST /api/v1/admin/legal/documents/{id}/approve`
- `POST /api/v1/admin/legal/documents/{id}/publish`

The `/legal` account surface shows effective published versions and the current
user's consent state. Onboarding includes the same consent component. The global
footer and trust center link to legal documents. Existing report, portfolio,
backtest, methodology, and investment-risk disclosures remain visible.

The admin operations surface requires an external legal approval reference,
the exact `LEGAL_COUNSEL_APPROVED` confirmation, a reason, and the current
optimistic version before approval. Publishing is available only from the
approved state.

The repository has no account-registration creation endpoint. The consent API
supports and tests the `registration` evidence source without introducing a
parallel registration architecture. Onboarding and settings use their explicit
sources.

## Security and audit

- Public endpoints return effective published documents only; placeholders are
  not exposed as published content.
- Consent endpoints derive the user exclusively from the authenticated session.
- Consent history has no caller-supplied user selector.
- Cross-user consent-history leakage: 0.
- Non-admin document mutation denial: PASS.
- Caller-asserted admin role acceptance: 0.
- Approval/publish optimistic version conflicts: PASS.
- Admin creation, approval, and publication record reason, actor, correlation
  ID, before/after state, and content hash in operational audit.
- Full legal content is not copied into audit payloads.
- Published-document mutation attempts are rejected by PostgreSQL.

## Required test coverage

| Requirement                             | Result |
| --------------------------------------- | ------ |
| Draft document                          | PASS   |
| Publish denied without review approval  | PASS   |
| Published version lifecycle             | PASS   |
| User consent                            | PASS   |
| Consent version snapshot                | PASS   |
| Locale snapshot and filtering           | PASS   |
| Material-version re-consent             | PASS   |
| Existing consent history                | PASS   |
| User IDOR isolation                     | PASS   |
| Admin RBAC                              | PASS   |
| Version conflict                        | PASS   |
| Audit                                   | PASS   |
| Registration consent source integration | PASS   |
| Onboarding integration                  | PASS   |
| Settings integration                    | PASS   |
| Critical disclosure visibility          | PASS   |
| OpenAPI                                 | PASS   |
| Playwright and keyboard access          | PASS   |

## Validation summary

| Gate                                 |       Result |
| ------------------------------------ | -----------: |
| Legal/consent PostgreSQL API tests   |     8/8 PASS |
| Database integration                 |   65/65 PASS |
| Database schema/migration unit tests |   29/29 PASS |
| Legal/admin Playwright selection     |     7/7 PASS |
| Full repository Playwright suite     |   32/32 PASS |
| Repository unit suites               | 724/724 PASS |
| Production build                     |         PASS |
| Format / ADR / lint / typecheck      |         PASS |
| Secret scan                          |   0 findings |
| IDOR failures                        |            0 |
| Admin authorization failures         |            0 |
| Consent failures                     |            0 |
| Skipped/fixme/only tests added       |            0 |

## Remaining external work

Authorized legal counsel must provide reviewed content and durable approval
references for every applicable locale and jurisdiction. Cookie applicability,
withdrawal requirements, retention language, data-provider licensing language,
and account deletion/export wording require counsel review. Those external
decisions cannot be inferred from local tests.

Until real legal approval exists, production publication remains blocked for
every document in this report.

## Transition

TASK-097 technical acceptance criteria pass. Consent, IDOR, admin authorization,
immutability, re-consent, and audit failures are zero, so TASK-098 may proceed.
This transition does not change TASK-080 or the external staging gate.
