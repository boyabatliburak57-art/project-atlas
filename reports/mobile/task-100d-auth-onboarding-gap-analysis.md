# TASK-100D Authentication and Onboarding Gap Analysis

Date: 2026-07-31

| Capability                    | Backend             | Web                 | Mobile Foundation          | Missing Work                                           | Action                                                             |
| ----------------------------- | ------------------- | ------------------- | -------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------ |
| Login/session issue           | BACKEND_READY       | BACKEND_READY       | MOBILE_ADAPTATION_REQUIRED | Cookie-only response had no SecureStore credential     | Added explicit mobile bearer response without changing web cookies |
| Session rotate/revoke         | BACKEND_READY       | BACKEND_READY       | BACKEND_READY              | Foreground serialization and cleanup                   | Implemented single-flight restore and full local cleanup           |
| Public registration           | API_GAP             | DEFERRED            | none                       | No public registration contract or policy              | `REGISTRATION_NOT_AVAILABLE`; no fake form                         |
| E-mail verification           | BACKEND_READY       | DEFERRED            | IMPLEMENTED                | PostgreSQL integration and native evidence remain open | Status/resend/confirm, guard and mobile deep link implemented      |
| Password reset                | BACKEND_READY       | BACKEND_READY       | MOBILE_ADAPTATION_REQUIRED | Native forms and token hygiene                         | Implemented typed request/confirm client and forms                 |
| Preferences                   | BACKEND_READY       | BACKEND_READY       | MOBILE_ADAPTATION_REQUIRED | Native UI and conflict handling                        | Added expectedVersion client and basic preferences UI              |
| Onboarding checkpoint         | BACKEND_READY       | BACKEND_READY       | MOBILE_ADAPTATION_REQUIRED | Native step/resume/skip UI                             | Shared domain state machine and server-compatible client added     |
| Legal consent                 | BACKEND_READY       | BACKEND_READY       | MOBILE_ADAPTATION_REQUIRED | Published documents are legally unapproved             | Technical boundary present; `LEGAL_REVIEW_REQUIRED` remains        |
| Demo resources                | BACKEND_READY       | BACKEND_READY       | MOBILE_ADAPTATION_REQUIRED | Choice-to-create orchestration                         | Owner-scoped backend reused; no live-data claim                    |
| Biometrics                    | NOT_APPLICABLE      | NOT_APPLICABLE      | MOBILE_ADAPTATION_REQUIRED | Local unlock adapter and re-auth rules                 | Implemented Expo Local Authentication adapter/controller           |
| Push registration             | DEFERRED            | DEFERRED            | DEFERRED                   | Device token binding                                   | TASK-100F                                                          |
| Transactional e-mail delivery | EXTERNAL_DEPENDENCY | SANDBOX_INTEGRATION | SANDBOX_INTEGRATION        | Production provider and delivery evidence              | Sandbox boundary; production fails closed                          |

Classification result: public registration remains unavailable. The authoritative verification API
contract is implemented; PostgreSQL/native execution evidence remains open.

Final remediation evidence (2026-08-03): PostgreSQL verification/security integration passed
14/14, the iOS Maestro suite passed 16/16, and the independent 28-screenshot native visual suite
passed with zero differences. No TASK-100D release-gate gap remains; production e-mail delivery is
still the documented `EXTERNAL_DEPENDENCY` / `SANDBOX_INTEGRATION` boundary.
