# Mobile v1 Platform Scope Decision

Date: 2026-07-31

- Mobile v1 Platform: `IOS_ONLY`
- Mobile v1 Form Factor: `PHONE_ONLY`
- Supported Native Device Profile: `STANDARD_IPHONE_ONLY`
- Required Device: iPhone 17
- Required OS: iOS 26.5
- Android Support: `DEFERRED_TO_V1_1`
- Tablet Support: `DEFERRED_TO_V1_1`
- Android Production Support Claim: `PROHIBITED_FOR_V1`
- Tablet Production Support Claim: `PROHIBITED_FOR_V1`

Android and tablet implementation may remain in the repository. Their native validation,
accessibility, visual regression, E2E and store release are not mobile v1 release evidence and
must not be reported as PASS or production-supported.

Production Readiness: NO-GO
Staging Gate: DEFERRED_EXTERNAL_GATE
Production Launch: BLOCKED
