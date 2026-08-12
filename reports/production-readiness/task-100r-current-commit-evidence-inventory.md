# TASK-100R Current-Commit Evidence Inventory

## Candidate identity

| Field | Value | Assessment |
| --- | --- | --- |
| Branch | `main` | Informational |
| HEAD | `fac5bfe45c2fafad159bb223a01e870bbd26bf07` | Recorded |
| Runtime-source fingerprint | `0e4301488a0abc14687e3338026936f1d0a0ca681ce2a64e15c5f21a3892bd39` | Exact audit boundary, not an immutable release identity |
| TASK-100L source fingerprint | `3c07165f2692e4a3c5498b53483e31325f19d802380fcf9a0443ff5e9dc0736c` | Matching mobile runtime subset |
| Worktree | DIRTY; extensive pre-existing mobile/API/worker changes | BLOCKING for immutable RC |
| Version | `0.1.0` | Local source version |
| Timestamp | `2026-08-11T01:37:56Z` | Audit start |

Audit-created files are documentation/report artifacts only. No runtime source was changed during
TASK-100R, so TASK-100K/L evidence remains applicable to the same runtime fingerprint. It is not,
however, a substitute for a committed and digest-bound release candidate.

## Toolchain

| Tool | Observed | Contract/status |
| --- | --- | --- |
| Node | exact-gate runs used 22.14.0; interactive shell currently resolves 26.5.0/22.23.1 | Contract is exact 22.14.0; local PATH drift is a documented operational risk |
| pnpm | 9.15.4 | MATCH |
| Java | 17.0.19 | PASS |
| Xcode | 26.5 (17F42) | PASS |
| Expo | 57.0.14 | PASS |
| Maestro | 2.7.0 | PASS |
| Docker | 29.6.1 | PASS |
| PostgreSQL | 17.10 | PASS |
| Redis | 7.4.9 | PASS |
| Host OS | macOS 26.5.1 (25F80) | Informational |
| Native profile | iPhone 17 / iOS 26.5 simulator | Required profile |

## Evidence rule

Tests executed during this audit are bound to the runtime fingerprint above. TASK-100K/L Maestro
and visual evidence is accepted because that runtime subset is unchanged. A clean commit and
artifact digest are still required before the final staging gate can be opened.
