# Settlement / Takas Model

`settlement_snapshots` stores immutable custody snapshots by canonical instrument, canonical institution/custodian, `settlementDate`, and provider revision. An optional `tradeDate` is separate and never substitutes for the settlement date.

Holding quantity/ratio describe a snapshot; change quantity/ratio describe a change. Unsupported fields are null, not zero. Current distribution, largest increase/decrease, history, and institution holdings are bounded queries over latest valid revisions, not duplicated persistence.
