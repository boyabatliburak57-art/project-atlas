# Mobile Production Bundle Security Scan

Date: 2026-08-10  
Artifact: Expo production iOS export, Hermes bundle `entry-d63db3504d350bb33ec1c1c8adf93e45.hbc`  
Status: `PASS`

The export completed with `EXPO_PUBLIC_APP_ENV=production` and an HTTPS allowlisted API URL. Production configuration has iOS-only platform scope, tablet support disabled, `NSAllowsArbitraryLoads=false`, `NSAllowsLocalNetworking=false`, file sharing disabled and no associated-domain claim.

| Semantic check                                          | Result           |
| ------------------------------------------------------- | ---------------- |
| Runtime API-host override                               | 0                |
| Exact development API URL                               | 0                |
| Authentication/provider bypass identifiers              | 0                |
| Token exposure/debug menu/component catalog identifiers | 0                |
| Portfolio/backtest/report/support bypass identifiers    | 0                |
| Raw fixture/development literals                        | PRESENT_REVIEWED |
| Provider/auth/storage secrets                           | 0                |
| Production-accessible test bypass                       | 0                |

Generic `localhost`, `staging`, `fixture` and screen-capture symbols remain inside third-party Expo/React Native code, validation regular expressions, safe status enums, route parameters and development catalog source. Semantic review confirmed that fixture activation requires `__DEV__`; production routes ignore fixture query parameters and the component catalog redirects to `/`. Data modules are compile-time fail-closed in production. Therefore raw strings are not reported as absent, while production-accessible test bypass remains zero. Universal links remain `EXTERNAL_CONFIGURATION_REQUIRED`; custom-scheme links continue through schema, authentication and ownership guards.
