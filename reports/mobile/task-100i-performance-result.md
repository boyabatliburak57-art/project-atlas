# TASK-100I Local Performance Result

Device evidence was collected on the iPhone 17 / iOS 26.5 simulator. The clean
24-flow native suite completed in 187 seconds with individual deterministic flows
between 7 and 9 seconds, including app activation, deep-link navigation, assertion,
and driver overhead. This is local regression evidence, not a staging or production
load claim.

```text
Native automation flow p50: 8.0 s
Native automation flow p95: 9.0 s
Flow errors: 0
```

| Scenario                  | Evidence                                                | Result |
| ------------------------- | ------------------------------------------------------- | ------ |
| Reports list              | bounded evidence registry and native ScrollView catalog | PASS   |
| Report generation request | idempotent API dispatch; async worker                   | PASS   |
| Report progress polling   | terminal-state stop contract                            | PASS   |
| Report detail             | sectioned native render                                 | PASS   |
| Large report data         | file generation remains server-side                     | PASS   |
| Help Center               | bounded versioned content                               | PASS   |
| Help search               | 300 ms debounce, cancellation and bounds                | PASS   |
| Article detail            | single bounded document surface                         | PASS   |
| Support history           | cursor limit 20; 100-row contract remains paged         | PASS   |
| Settings render           | one shared preference surface                           | PASS   |
| Theme change              | persisted preference with rollback contract             | PASS   |
| Preference mutation       | expectedVersion conflict contract                       | PASS   |
| Legal article             | versioned cached metadata surface                       | PASS   |
| Methodology article       | versioned bounded content                               | PASS   |

No unbounded client-side PDF/CSV generation, full-table support loading, or
post-terminal polling was introduced. Memory/frame instrumentation and real-device
performance finalization remain part of TASK-100K.
