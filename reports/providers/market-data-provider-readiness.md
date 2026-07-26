# TASK-093 — Market Data Provider Readiness

Assessment date: 2026-07-26  
Result: `PROVIDER_CREDENTIAL_REQUIRED`

```text
Production Readiness: NO-GO
Staging Gate: DEFERRED_EXTERNAL_GATE
Product Development: CONTINUE
```

## Provider

| Field                      | Result                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------- |
| Provider name              | Not selected                                                                           |
| Integration classification | `PROVIDER_CREDENTIAL_REQUIRED`                                                         |
| Real production adapter    | Not registered                                                                         |
| Sandbox adapter            | Not registered                                                                         |
| Fake/fixture adapter       | Present for local and test use only                                                    |
| Credential status          | No provider credential reference or resolvable credential supplied                     |
| Contract status            | Provider-neutral HTTP/credential boundary implemented; vendor mapping awaits selection |
| Licensing status           | Contract metadata is required by configuration; no executed provider contract supplied |

No repository evidence identifies an approved market-data vendor, endpoint contract, credential,
secret-store entry, redistribution grant, or production composition registration. The adapter
boundary added by TASK-093 is therefore not classified as `REAL_INTEGRATION` or
`SANDBOX_INTEGRATION`.

Staging and production default composition now fail fast instead of silently registering the fake
market-data provider. Local and test compositions retain the fake adapter for deterministic tests.

## Capability readiness

| Capability                     | Contract/adapter boundary                                                                                                  | Live provider evidence | Status                                           |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------ |
| Instruments and symbol mapping | Implemented                                                                                                                | None                   | Credential/provider required                     |
| Listing and delisting metadata | Implemented and persisted by instrument import                                                                             | None                   | Credential/provider required                     |
| Daily OHLCV                    | Implemented                                                                                                                | None                   | Credential/provider required                     |
| Intraday OHLCV                 | Capability-driven                                                                                                          | None                   | Provider capability confirmation required        |
| Backfill                       | Bounded `from`/`to` and pagination contract implemented                                                                    | None                   | Credential/provider required                     |
| Incremental update             | Cursor and limit propagation implemented                                                                                   | None                   | Credential/provider required                     |
| Corrected-data revision        | Provider revision/source/available-at retained at adapter boundary; PostgreSQL immutable value revisions already validated | None                   | Live replay required                             |
| Trading calendar               | Implemented with IANA timezone, open/holiday sessions and lineage                                                          | None                   | Persistence/scheduler and provider required      |
| Market sessions                | Implemented with explicit UTC instants and timezone                                                                        | None                   | Persistence/scheduler and provider required      |
| Index membership               | Implemented with effective dates and revision metadata                                                                     | None                   | Persistence/reconciliation and provider required |
| Sector membership              | Implemented independently from index membership                                                                            | None                   | Persistence/reconciliation and provider required |
| Benchmark series               | Implemented with adjustment, cutoff and lineage metadata                                                                   | None                   | Persistence/scheduler and provider required      |
| Provider health                | Implemented with safe degradation mapping                                                                                  | None                   | Live probe required                              |
| Rate limiting                  | Headers, retry-after and bounded retry implemented                                                                         | None                   | Vendor header contract confirmation required     |
| Licensing/redistribution       | Mandatory typed metadata                                                                                                   | No approved contract   | Legal approval required                          |

## Data and security invariants

- Decimal price and volume values remain strings through the adapter; no floating-point conversion
  occurs.
- Every bar/session/benchmark timestamp is offset-qualified and normalized to `Date`.
- Missing bars are absent; the adapter does not synthesize zero bars.
- Duplicate bars are detected before persistence, and the PostgreSQL store remains idempotent.
- Corrected closed bars create immutable database revisions rather than overwriting the prior
  revision.
- Provider revision, source timestamp and available-at are separate adapter fields.
- Listing and delisting dates are retained by instrument normalization and persistence.
- Membership effective dates and benchmark adjustment/cutoff metadata are retained.
- Strict schemas reject provider-specific raw fields before they cross the normalized boundary.
- Credentials are resolved only at the transport boundary. Errors and readiness output do not
  contain credential values or upstream response bodies.
- Provider payloads and symbols are not used as metric-label dimensions.

## Test evidence

| Required scenario           | Evidence                                                             | Result                                              |
| --------------------------- | -------------------------------------------------------------------- | --------------------------------------------------- |
| 1. Instrument mapping       | Vendor contract test 1                                               | PASS                                                |
| 2. Unknown symbol           | Vendor contract test 2                                               | PASS                                                |
| 3. Daily OHLCV              | Vendor contract test 3                                               | PASS                                                |
| 4. Intraday OHLCV           | Vendor contract test 4                                               | PASS (contract fixture; live capability unverified) |
| 5. Timezone/session         | Vendor contract test 5                                               | PASS                                                |
| 6. Trading holiday          | Vendor contract test 6                                               | PASS                                                |
| 7. Duplicate batch          | Vendor contract test 7 and PostgreSQL integration                    | PASS                                                |
| 8. Incremental ingestion    | Vendor contract test 8                                               | PASS                                                |
| 9. Corrected bar            | Vendor contract test 9 and PostgreSQL immutable revision integration | PASS                                                |
| 10. Listing/delisting       | Vendor contract test 10 and instrument persistence integration       | PASS                                                |
| 11. Index membership dates  | Vendor contract test 11                                              | PASS                                                |
| 12. Sector membership       | Vendor contract test 12                                              | PASS                                                |
| 13. Benchmark series        | Vendor contract test 13                                              | PASS                                                |
| 14. Rate limit              | Vendor contract test 14                                              | PASS                                                |
| 15. Timeout/retry           | Vendor contract test 15                                              | PASS                                                |
| 16. Invalid payload         | Vendor contract test 16                                              | PASS                                                |
| 17. Provider outage         | Vendor contract test 17                                              | PASS                                                |
| 18. Credential redaction    | Vendor contract test 18                                              | PASS                                                |
| 19. Contract fixture replay | Vendor contract test 19                                              | PASS                                                |
| 20. PostgreSQL integration  | Worker market-data integration suite                                 | 68/68 aggregate PASS                                |
| 21. Worker integration      | BullMQ market-data composition integration                           | PASS within 68/68                                   |

The 19 adapter tests use deterministic contract fixtures. They prove mapping and boundary behavior,
not connectivity to a real vendor. The PostgreSQL and BullMQ tests use local isolated
infrastructure and are not staging or live-provider evidence.

## Production blockers

1. Select and approve a market-data provider.
2. Obtain an executed license defining storage, derived-data and redistribution rights.
3. Supply an approved sandbox or production base URL and endpoint contract.
4. Provision a scoped credential in the deployment secret store and provide only its reference to
   the worker.
5. Implement the selected vendor's raw-field mapping inside the vendor module boundary.
6. Register that concrete adapter and credential resolver in the staging/production composition
   root.
7. Add persistent calendar, membership and benchmark ingestion/reconciliation jobs.
8. Replay vendor-provided contract fixtures and run authenticated sandbox/live acceptance tests.
9. Validate real rate-limit headers, pagination, correction delivery and outage behavior.
10. Complete legal approval for attribution and redistribution metadata.

Until these blockers are closed, this integration must remain:

```text
PROVIDER_CREDENTIAL_REQUIRED
```
