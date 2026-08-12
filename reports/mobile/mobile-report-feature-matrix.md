# Mobile Report Feature Matrix

| Type                               | Backend         | Worker                          | Mobile                                   | Export  | Security         | Tests        | Status   |
| ---------------------------------- | --------------- | ------------------------------- | ---------------------------------------- | ------- | ---------------- | ------------ | -------- |
| Portfolio summary/performance/risk | BACKEND_READY   | report-worker-v1                | preview, privacy and data-quality states | PDF/CSV | owner scoped     | unit/API/E2E | PASS     |
| Scanner run/history                | BACKEND_READY   | report-worker-v1                | readable conditions; raw AST excluded    | PDF/CSV | owner scoped     | unit/API/E2E | PASS     |
| Backtest result                    | BACKEND_READY   | report-worker-v1                | metrics, PIT disclosure, costs           | PDF/CSV | revision scoped  | unit/API/E2E | PASS     |
| Experiment comparison              | BACKEND_READY   | report-worker-v1                | neutral comparison                       | PDF/CSV | owner scoped     | unit/API/E2E | PASS     |
| Market/symbol analysis             | FEATURE_FLAGGED | not requested                   | hidden when unavailable                  | none    | capability gated | contract     | DEFERRED |
| PDF                                | BACKEND_READY   | minimal human-readable renderer | exposed                                  | PDF     | owner scoped     | worker/E2E   | PASS     |
