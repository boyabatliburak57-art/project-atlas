# Corporate Actions Provider Readiness

Assessment date: 2026-07-26  
Status: `CREDENTIAL_REQUIRED`

```text
Production Readiness: NO-GO
Staging Gate: DEFERRED_EXTERNAL_GATE
Product Development: CONTINUE
```

## Provider and credential status

No approved real or sandbox corporate-actions provider, credential, endpoint schema, or executed
license was found. Existing portfolio and backtest corporate-action fixtures prove internal
behavior only and are not classified as an external integration.

TASK-094 adds a credential-bound provider module with strict normalized events. The module remains
inactive until a concrete vendor mapping and credential resolver are registered.

## Capability readiness

| Action             | Contract coverage                                                 | Live evidence               |
| ------------------ | ----------------------------------------------------------------- | --------------------------- |
| Split              | Factor, announcement/ex/record/payment/effective dates, revision  | Missing                     |
| Reverse split      | Factor and full lineage                                           | Missing                     |
| Bonus share        | Factor and full lineage                                           | Missing                     |
| Cash dividend      | Cash per share, currency and payment date                         | Missing                     |
| Rights issue       | Factor, subscription price and currency                           | Missing                     |
| Symbol change      | Old/new symbols and effective date                                | Missing                     |
| Merger/acquisition | Successor symbol and effective date                               | Provider support unverified |
| Delisting          | Effective date, optional successor and explicit downstream policy | Missing                     |

Provider event identity and revision are retained for deduplication. Portfolio persistence already
rejects a second application of the same corporate-action identity. Backtest policy prevents:

- applying split/bonus position factors when prices are already split-adjusted;
- paying dividends again when prices are total-return adjusted;
- using an action revision before revisionAvailableAt;
- applying a dividend before its payment date.

Delisting remains explicit through `lastAvailableClose`, `writeOff`, or `notEvaluable` backtest
policies.

## Test results

- Financial/corporate-action provider contract suite: 20/20 PASS.
- Split, reverse split, bonus share, dividend, rights issue and delisting mapping: PASS.
- Provider retry/non-retry, credential redaction and replay: PASS.
- Backtest point-in-time and double-application guards: existing regression PASS.
- Portfolio corporate-action deduplication and valuation integration: existing PostgreSQL
  regression PASS.
- Raw provider payload leakage: 0.

All adapter payloads are deterministic fixtures. They are not real provider or staging evidence.

## Production blockers

1. Select and approve a corporate-actions provider.
2. Provision endpoint and scoped secret-store credential.
3. Approve licensing, historical correction and redistribution terms.
4. Map vendor event identities, revisions and all relevant dates.
5. Confirm support for rights issues, symbol changes and mergers/acquisitions.
6. Reconcile actions against raw/split-adjusted/total-return price series.
7. Register a concrete staging/production adapter and run live replay, duplicate and correction
   tests.

Until these are complete, the status remains `CREDENTIAL_REQUIRED`.
