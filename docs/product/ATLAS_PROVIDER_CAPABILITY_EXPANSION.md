# Atlas Provider Capability Expansion

**Status:** `DEFINED`
**Implementation owner:** TASK-110C and feature tasks TASK-110D–TASK-110L

## Status model

| Status                            | Meaning                                                           | Product behavior                                           |
| --------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------- |
| `SUPPORTED_LIVE`                  | Authorized live source is healthy and within freshness policy     | Render data with source and as-of metadata                 |
| `SUPPORTED_DELAYED`               | Authorized source is intentionally delayed                        | Render only with visible delay and as-of label             |
| `PROVIDER_REQUIRED`               | No approved provider is configured                                | Fail closed; explain provider requirement                  |
| `LICENSE_REQUIRED`                | Access/redistribution rights are not approved for this use        | Do not fetch, persist, derive or display restricted data   |
| `EXTERNAL_CONFIGURATION_REQUIRED` | Contract exists but external credentials/configuration are absent | Fail closed; no fixture fallback                           |
| `NOT_AVAILABLE`                   | Capability is unsupported by the selected provider/product tier   | Show truthful unavailable state; do not imply roadmap date |

No implicit `SUPPORTED_*` state exists. Unknown capability, expired decision, failed entitlement,
unhealthy source or unverifiable license resolves to a closed state.

## Registry key and decision record

Registry resolution is at least keyed by `capability`, `provider`, `market`, `environment`,
`productTier` and intended use (`display`, `derivedAnalytics`, `alerts`, `export`, `redistribution`).
Each decision records status, effective interval, delay policy, freshness SLA, license reference,
entitlement, allowed operations, source attribution, owner, last verification and audit reason.

Client applications receive a bounded public projection; credentials, private contract terms and
internal provider diagnostics never reach the client. Server-side authorization and entitlement
remain authoritative.

## Expanded capability groups

| Group                    | Examples                                                              | Safe initial posture until verified                  |
| ------------------------ | --------------------------------------------------------------------- | ---------------------------------------------------- |
| KAP / events             | disclosures, results, buybacks, dividends, capital actions, IPOs      | `PROVIDER_REQUIRED` or approved public-source status |
| Institutional flow / AKD | distribution, buyer/seller, institution flow, money flow              | `LICENSE_REQUIRED`                                   |
| Settlement / takas       | foreign/institutional holdings, trend, anomaly inputs                 | `LICENSE_REQUIRED`                                   |
| Market measures          | VBTS, gross settlement, single price, order package, short-sale rules | `PROVIDER_REQUIRED`; source-specific terms verified  |
| Calendars                | economic, earnings, dividend, event, IPO, VIOP expiry                 | capability-specific; never infer live status         |
| Analyst / ownership      | expectations, fund positions, institutional ownership                 | `LICENSE_REQUIRED`                                   |
| Funds                    | holdings, performance, comparison measures                            | `PROVIDER_REQUIRED` or `LICENSE_REQUIRED`            |
| VIOP                     | basis, OI, volume, rollover, institutional flow                       | `LICENSE_REQUIRED` unless verified otherwise         |
| Depth / order book       | levels, snapshots, liquidity analytics                                | `LICENSE_REQUIRED`                                   |
| Charts / comparison      | drawings are local; market inputs inherit source capability           | most restrictive input status wins                   |

## Derived-data policy

A derived metric cannot escape restrictions on its inputs. The decision engine evaluates whether
the license permits derivation, persistence, alerting, export and redistribution. Composite views
show per-source lineage and use the most restrictive unresolved input state. Stale or partial input
must not silently produce a current or complete result.

## Fake-data and failure contract

Production runtime must contain zero fake provider data. Test/demo fixtures are build- and
environment-isolated, carry `DEMO_UI_FIXTURE / NOT_LIVE`, and cannot satisfy health, parity or
production evidence. API responses use typed unavailable/restricted states; clients do not replace
errors with plausible values. Caches preserve capability and as-of metadata and must not serve data
after entitlement/license revocation.

## Verification gates

Before a capability becomes `SUPPORTED_LIVE` or `SUPPORTED_DELAYED`, evidence must cover provider
selection, credentials, field contract, timestamps/time zone, corporate-action handling,
reconciliation, retention, license and redistribution, entitlement, health/SLA, failure behavior,
source disclosure and audit logging. These checks do not change the current external blockers or
release posture.
