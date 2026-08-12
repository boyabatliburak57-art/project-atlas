# Mobile QA Strategy

The mobile v1 QA stack combines unit/component contracts, API and ownership integration, native Maestro, native screenshot comparison, security scans and explicit manual assistive-technology verification.

TASK-100D through TASK-100K active iOS phone flows form the release inventory. Superseded flows and deferred Android/tablet flows are excluded. Every active flow must execute on the same candidate with zero failure, skip, retry-only or unexecuted result. A separate critical suite covers at least 32 flows across authentication, markets, scanner, alerts, portfolio, strategy, reports, offline, app lock and account cleanup. Random-order coverage includes clean, warm, cached and post-logout state.

The visual baseline is frozen during ordinary QA. An intentional accessibility baseline update requires a recorded failure, reviewed change, explicit update command and independent normal diff. Fixtures are deterministic, test-only and contain no real user, financial, support, token or strategy data.

VoiceOver is a distinct manual gate. Automated tree evidence never closes its waiver. External providers, APNs, universal-link deployment, transactional e-mail and legal review remain outside local QA.
