# TASK-110F2 Visual Result

Canonical profile: iPhone 17 / iOS 26.5 / tr-TR / Europe-Istanbul  
Simulator: `14D95876-46F5-42E2-87D6-E19514DACFD1`

| Evidence                           | Count / Result                                               |
| ---------------------------------- | ------------------------------------------------------------ |
| Previous baseline                  | 204                                                          |
| Generated                          | 9 capture attempts (one transition-frame candidate rejected) |
| Final required candidates          | 8                                                            |
| Reviewed                           | 8                                                            |
| Approved                           | 8                                                            |
| Rejected final                     | 0                                                            |
| Added baselines                    | 8                                                            |
| Replaced baselines                 | 0                                                            |
| Final baseline                     | 212                                                          |
| Targeted clean diff                | 8/8 PASS                                                     |
| Differences / missing / unexpected | 0 / 0 / 0                                                    |
| Baseline mutation in normal test   | 0                                                            |

The initially blank light Overview transition frame was rejected, regenerated after route stabilization, and reviewed before migration. Light/dark safe-area, contrast, temporal rail, provider-required state, short-selling, and Symbol Detail integration were approved. Full visual diff is `DEFERRED_TO_MILESTONE_VALIDATION`.
