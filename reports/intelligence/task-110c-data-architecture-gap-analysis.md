# TASK-110C Data Architecture Gap Analysis

| Capability                     | Existing Domain           | Existing Provider Contract | New Canonical Domain                   | New Schema Needed     | Temporal Risk          | Licensing Risk | Target Task |
| ------------------------------ | ------------------------- | -------------------------- | -------------------------------------- | --------------------- | ---------------------- | -------------- | ----------- |
| KAP disclosures                | corporate actions partial | corporateActions           | CorporateDisclosure                    | Yes                   | correction/availableAt | High           | 110D        |
| financial-result events        | fundamentals              | fundamentals               | Disclosure + MarketEvent               | Reuse revisions       | restatement            | High           | 110D        |
| new-business events            | none                      | none                       | Disclosure + MarketEvent               | Reuse                 | publication            | Medium         | 110D        |
| buybacks                       | corporate actions partial | corporateActions           | Disclosure → CorporateAction           | Reuse                 | effective time         | Medium         | 110D        |
| dividends                      | corporate actions         | corporateActions           | Disclosure → CorporateAction           | Reuse existing action | double application     | Medium         | 110D        |
| capital actions                | corporate actions         | corporateActions           | Disclosure → CorporateAction           | Reuse existing action | effective date         | Medium         | 110D        |
| IPO events                     | none                      | none                       | Disclosure + Calendar                  | Reuse                 | revisions              | Medium         | 110D        |
| AKD                            | none                      | none                       | InstitutionalFlow                      | Yes                   | trade session/cutoff   | High           | 110E        |
| institutional buyers/sellers   | none                      | none                       | InstitutionalFlow projection           | No                    | ranking cutoff         | High           | 110E        |
| institution-specific flow      | none                      | none                       | InstitutionalFlow projection           | No                    | aliases                | High           | 110E        |
| money flow                     | none                      | none                       | InstitutionalFlow                      | Reuse                 | derived/source split   | High           | 110E        |
| settlement/takas               | none                      | none                       | Settlement                             | Yes                   | T+ semantics           | High           | 110E        |
| foreign settlement             | none                      | none                       | Settlement projection                  | No                    | source classification  | High           | 110E        |
| institutional settlement       | none                      | none                       | Settlement projection                  | No                    | identity               | High           | 110E        |
| settlement trends              | none                      | none                       | Settlement projection                  | No                    | snapshots              | High           | 110E        |
| settlement anomaly inputs      | none                      | none                       | Settlement                             | No                    | no-look-ahead          | High           | 110M        |
| VBTS                           | none                      | none                       | MarketMeasure                          | Yes                   | validity period        | Medium         | 110F        |
| gross settlement measures      | none                      | none                       | MarketMeasure                          | Reuse                 | effective window       | Medium         | 110F        |
| single-price measures          | none                      | none                       | MarketMeasure                          | Reuse                 | effective window       | Medium         | 110F        |
| order-package measures         | none                      | none                       | MarketMeasure                          | Reuse                 | correction             | Medium         | 110F        |
| short-selling restrictions     | none                      | none                       | MarketMeasure                          | Reuse                 | restriction period     | High           | 110F        |
| short-selling activity         | none                      | none                       | Activity observation                   | Contract only         | session/cutoff         | High           | 110F        |
| economic calendar              | trading calendar only     | tradingCalendar            | Calendar                               | Contract only         | timezone/revision      | Medium         | 110G        |
| earnings calendar              | fundamentals partial      | fundamentals               | Calendar                               | Contract only         | availability           | Medium         | 110G        |
| dividend calendar              | corporate actions         | corporateActions           | Calendar projection                    | No                    | ex/pay dates           | Medium         | 110G        |
| corporate event calendar       | corporate actions         | corporateActions           | Calendar projection                    | No                    | effective date         | Medium         | 110G        |
| IPO calendar                   | none                      | none                       | Calendar                               | Contract only         | revision               | Medium         | 110G        |
| VIOP expiry                    | trading sessions          | marketSessions             | Calendar + Derivatives                 | Contract only         | timezone               | High           | 110G/110K   |
| company timeline inputs        | fragmented                | mixed                      | MarketEvent projection                 | Event schema          | availableAt            | Mixed          | 110H        |
| peer/company comparison inputs | fundamentals              | fundamentals               | Metric registry                        | No                    | cutoff alignment       | Mixed          | 110H        |
| analyst expectations           | none                      | none                       | AnalystConsensus                       | Contract only         | revisions              | High           | 110H        |
| fund positions                 | none                      | none                       | FundHolding                            | Yes                   | reporting/publication  | High           | 110J        |
| fund ownership                 | none                      | none                       | FundHolding projection                 | No                    | reporting lag          | High           | 110J        |
| fund analytics                 | none                      | none                       | Fund                                   | Master only           | cutoff                 | High           | 110J        |
| VIOP contracts                 | none                      | none                       | Derivatives                            | Yes                   | expiry/session         | High           | 110K        |
| futures basis                  | benchmark partial         | benchmarks                 | Derivative statistics                  | Contract only         | spot synchronization   | High           | 110K        |
| open interest                  | none                      | none                       | Derivative statistics                  | Contract only         | cutoff                 | High           | 110K        |
| futures volume                 | OHLCV spot                | ohlcv                      | Derivative statistics                  | Contract only         | session                | High           | 110K        |
| rollover                       | none                      | none                       | Derivative statistics                  | Contract only         | contract mapping       | High           | 110K        |
| institutional VIOP flow        | none                      | none                       | Derivatives/InstitutionalFlow relation | Contract only         | identity/cutoff        | High           | 110K        |
| market depth/order book        | none                      | none                       | OrderBook                              | No relational history | timestamp/volume       | Very high      | 110L        |

Conclusion: canonical shared schema is required for stable masters and revision-bearing observations; live provider implementations remain in owning tasks.
