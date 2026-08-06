# Mobile v1 Form-Factor Scope Decision

```text
Mobile v1 Supported Form Factor: PHONE_ONLY
Supported Platforms: iOS phones, Android phones
Tablet Support: DEFERRED_TO_V1_1
Tablet Navigation: EXPERIMENTAL_NOT_RELEASE_GATED
Tablet Production Support Claim: PROHIBITED_FOR_V1
```

Mobile v1 supports small, standard and large phone layouts. Responsive tablet primitives and
NavigationRail remain in the repository as experimental v1.1 architecture. They are excluded from
v1 store metadata, native validation, accessibility, visual regression, E2E and feature-parity
PASS claims. This scope adjustment does not change production or staging readiness.
