# BIST Intelligence Domain Ownership

| Surface                                           | Canonical owner/source                                     |
| ------------------------------------------------- | ---------------------------------------------------------- |
| AKD analysis/scanner/company tab                  | InstitutionalFlowDomain                                    |
| Takas analysis/scanner/company tab                | SettlementDomain                                           |
| KAP feed                                          | CorporateDisclosureDomain                                  |
| Company Timeline/Event Scanner/Inbox/Event Impact | MarketEventDomain projection                               |
| VBTS/restrictions                                 | MarketMeasureDomain                                        |
| Short-sale statistics                             | Institutional/market activity observation, not restriction |
| Calendar surfaces                                 | CalendarDomain typed category                              |
| Fund/company ownership                            | FundDomain + FundHoldingDomain                             |
| Analyst expectations                              | AnalystConsensusDomain                                     |
| VIOP                                              | DerivativesDomain; underlying relation to InstrumentDomain |
| Depth                                             | OrderBookDomain                                            |
| Compare                                           | Canonical metric registry over owning domains              |
| Pulse/anomaly/regime                              | DerivedFinding over canonical inputs                       |

Company Timeline is a point-in-time union projection across events, disclosures, existing financial/corporate-action data, restrictions and future methodology-backed findings. Smart Inbox stores source reference plus user relevance/read state, never copied KAP content. Scanner AST keeps its version and exposes only family extension points in TASK-110C; condition catalogs arrive in TASK-110I.
