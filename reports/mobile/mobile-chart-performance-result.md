# Mobile Chart Performance Result

Date: 2026-08-04

Local deterministic contract profile: iPhone 17 / iOS 26.5, 32 OHLCV points, six maximum overlays.
Transform and summary are linear, memoized and bounded to the server maximum of 2,000 points.
Crosshair state is one integer index; tooltip does not rebuild series. No listeners survive unmount.
This is local engineering evidence, not staging or production load evidence.

The isolated PostgreSQL-backed market benchmark completed on 2026-08-05 with zero errors:

| Scenario     |      p50 |      p95 |      max | Result |
| ------------ | -------: | -------: | -------: | ------ |
| PERF-MKT-001 |  1.28 ms |  2.03 ms |  3.61 ms | PASS   |
| PERF-MKT-002 |  2.62 ms |  3.65 ms |  7.00 ms | PASS   |
| PERF-MKT-003 |  3.40 ms | 31.14 ms | 31.14 ms | PASS   |
| PERF-MKT-004 | 36.10 ms | 52.10 ms | 52.10 ms | PASS   |
| PERF-MKT-005 |  4.16 ms |  5.20 ms |  6.69 ms | PASS   |

These figures are local deterministic engineering measurements, not staging or production load
evidence.
