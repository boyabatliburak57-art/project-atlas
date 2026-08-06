# Mobile Transaction Feature Matrix

| Type/policy               | Backend authoritative | Mobile validation          | Idempotency | Audit/correction  | Status |
| ------------------------- | --------------------- | -------------------------- | ----------- | ----------------- | ------ |
| BUY / SELL records        | PASS                  | Decimal/bounds/excess-sell | PASS        | PASS              | PASS   |
| CASH_DEPOSIT / WITHDRAWAL | PASS                  | Positive canonical amount  | PASS        | PASS              | PASS   |
| DIVIDEND / fee / tax      | PASS                  | Capability/type aware      | PASS        | PASS              | PASS   |
| Posted/system edits       | PASS                  | Actions hidden             | N/A         | Reversal required | PASS   |
| Corporate-action dedup    | PASS                  | No client application      | PASS        | PASS              | PASS   |
