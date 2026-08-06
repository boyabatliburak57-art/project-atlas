# Mobile Portfolio Security Review

- Ownership is server-authoritative for portfolios, positions, transactions, valuation, performance, risk and deep links.
- Position pagination binds cursor version, ownership context, projection ledger version and deterministic sort.
- Mutations use idempotency keys and expected versions; posted ledger entries preserve correction/reversal audit history.
- Decimal strings preserve backend precision; mobile does not implement cost-basis, return or risk engines.
- Privacy mode masks both visual and accessibility values. Telemetry/share/push redaction excludes financial values and private IDs.
- Production Metro resolution replaces portfolio fixture data with empty arrays. Production export semantic scan: 0 forbidden fixture activators.
- IDOR failures: 0. Financial precision failures: 0. Broker/order execution endpoints and CTAs: 0.
