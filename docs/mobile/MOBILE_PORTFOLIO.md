# Mobile Portfolio

Atlas mobile v1 provides owner-scoped portfolio records, positions and analysis on iOS. It is not a broker, custodian or portfolio manager and does not transmit orders. Market-dependent values fail closed with `PROVIDER_REQUIRED`; recorded quantity, average cost and ledger history remain visible when safe. Portfolio selection cancels the prior ownership-scoped query context. Mutations use backend authorization, idempotency and optimistic concurrency.
