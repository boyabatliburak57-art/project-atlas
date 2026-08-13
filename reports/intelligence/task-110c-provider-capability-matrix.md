# TASK-110C Provider Capability Matrix

| Capability family | IDs                                                                    | Code-ready | External status                       | Runtime default              |
| ----------------- | ---------------------------------------------------------------------- | ---------- | ------------------------------------- | ---------------------------- |
| Market            | market.price, market.ohlcv, market.depth                               | Yes        | depth LICENSE/PROVIDER_REQUIRED       | UNAVAILABLE until configured |
| Institutional     | institutional.akd, institutional.moneyFlow                             | Yes        | PROVIDER_REQUIRED_OR_LICENSE_REQUIRED | UNAVAILABLE                  |
| Settlement        | settlement.snapshot, settlement.foreign                                | Yes        | PROVIDER_REQUIRED_OR_LICENSE_REQUIRED | UNAVAILABLE                  |
| Disclosure        | disclosure.kap, disclosure.financialResult, disclosure.corporateAction | Yes        | PROVIDER_REQUIRED_OR_LICENSE_REQUIRED | UNAVAILABLE                  |
| Measures          | marketMeasure.vbts, marketMeasure.shortSelling                         | Yes        | PROVIDER_REQUIRED_OR_LICENSE_REQUIRED | UNAVAILABLE                  |
| Calendar          | economic, earnings, dividend, IPO, corporate, VIOP expiry              | Yes        | PROVIDER_REQUIRED_OR_LICENSE_REQUIRED | UNAVAILABLE                  |
| Funds             | metadata, performance, holdings                                        | Yes        | PROVIDER_REQUIRED_OR_LICENSE_REQUIRED | UNAVAILABLE                  |
| Analyst           | consensus, targetPrice                                                 | Yes        | LICENSE_REQUIRED                      | UNAVAILABLE                  |
| Derivatives       | contracts, openInterest, basis, rollover, institutionalFlow            | Yes        | PROVIDER_REQUIRED_OR_LICENSE_REQUIRED | UNAVAILABLE                  |

Product availability and operational health are independent columns/enums. No registration claims support without adapter plus credential reference.
