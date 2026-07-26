# Fundamentals Provider Readiness

Assessment date: 2026-07-26  
Status: `CREDENTIAL_REQUIRED`

```text
Production Readiness: NO-GO
Staging Gate: DEFERRED_EXTERNAL_GATE
Product Development: CONTINUE
```

## Provider and credential status

No approved real or sandbox fundamentals provider, endpoint contract, credential reference,
secret-store entry, or executed license was found. The production composition still has no
concrete external fundamentals adapter registration. Fake statements and replay fixtures are not
classified as a real integration.

TASK-094 provides a provider-specific HTTP/credential boundary that can be completed after vendor
selection. It is not activated without a credential resolver.

## Capability readiness

| Capability                    | Repository state                                                            | Live evidence          |
| ----------------------------- | --------------------------------------------------------------------------- | ---------------------- |
| Annual statements             | Strict contract and normalization implemented                               | Missing                |
| Quarterly statements          | Strict contract and normalization implemented                               | Missing                |
| Fiscal periods                | Explicit annual/quarterly period metadata                                   | Missing                |
| Publication date              | Preserved independently                                                     | Missing                |
| Available-at                  | Preserved and used as PostgreSQL data cutoff                                | Missing                |
| Provider revision/restatement | Immutable revision uniqueness and point-in-time selection                   | Local integration only |
| Currency                      | ISO uppercase, no implicit FX conversion                                    | Missing vendor policy  |
| Unit                          | Exact decimal scaling to base units                                         | Local contract test    |
| Consolidated/standalone       | Explicit statement scope                                                    | Missing vendor mapping |
| TTM compatibility             | Four-quarter compatibility and missing-input policy                         | Local domain test      |
| Source lineage                | Provider, revision, source timestamp, publication and available-at retained | Missing live replay    |

Missing metrics remain `null`/missing with `PROVIDER_METRIC_MISSING`; they are never normalized to
zero. Restatements insert a new snapshot and do not overwrite the prior provider revision.
Point-in-time selection cannot observe a revision before its available-at timestamp.

## Test results

- Financial provider contract suite: 20/20 PASS, including annual, quarterly, publication,
  available-at, currency, units, missing metrics, TTM, retry, credential redaction and replay.
- PostgreSQL fundamentals integration: immutable restatement and before/after cutoff PASS.
- Raw provider payload isolation: PASS.
- Credential leakage: 0.

These are local contract fixtures and isolated PostgreSQL evidence. They are not sandbox,
production, or staging-provider evidence.

## Production blockers

1. Select and approve a fundamentals provider.
2. Obtain licensed storage, historical revision and redistribution terms.
3. Provision sandbox/production endpoints and a scoped secret-store credential.
4. Implement the selected vendor's raw field and fiscal-period mapping.
5. Confirm currency/FX policy, unit definitions and consolidated/standalone semantics.
6. Replay vendor-supplied restatement history and verify publication/available-at behavior.
7. Register the concrete adapter in staging/production composition and run live acceptance tests.

Until these are complete, the status remains `CREDENTIAL_REQUIRED`.
