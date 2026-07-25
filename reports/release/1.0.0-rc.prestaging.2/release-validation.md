# Local RC validation

Status: **PASS — local pre-staging scope only**

- Source commit: `1525f1b2d3a2ca9b7a9e9b3de7fc5c5846b45cc5`
- Four local images built with matching OCI revision labels and non-root `node`
  users.
- Four SPDX SBOMs generated from the current local images.
- Four Trivy Critical/High scans: PASS, findings `0`.
- Production dependency audit: Critical `0`, High `0`.
- Cache-free lint, typecheck, unit tests, and production build: 29/29 tasks.
- Unit tests: 635/635 PASS.
- Worker PostgreSQL/Redis integration: 68/68 PASS.
- OpenAPI, migration, secret scan, and security validation: PASS.
- Strategy Lab complete performance suite: PASS.
- `PERF-BT-003`: 100,000 combined events, 5 repetitions, p95 `7,027.20 ms`
  against the unchanged `8,000 ms` threshold.
- Full BIST p95 `27,101.13 ms`; event engine p95 `5,447.29 ms`; experiment p95
  `89.50 ms`; result APIs and reproducibility PASS.

This is `NOT_STAGING_EVIDENCE`. It has no registry digest and cannot change
TASK-080 or authorize production deployment.
