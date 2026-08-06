# Mobile Portfolio Risk Matrix

| Metric                      | Backend         | Required Data            | Methodology           | Mobile                  | Tests              | Status |
| --------------------------- | --------------- | ------------------------ | --------------------- | ----------------------- | ------------------ | ------ |
| Concentration / top weights | PASS            | positions/valuation      | versioned thresholds  | PASS                    | Domain/Maestro     | PASS   |
| Volatility                  | PASS            | >=30 observations        | backend annualization | PASS                    | NOT_EVALUABLE test | PASS   |
| Maximum drawdown            | PASS            | valuation history        | peak/trough/recovery  | PASS                    | Domain/Maestro     | PASS   |
| Beta/relative risk          | PASS            | aligned benchmark        | backend authoritative | BENCHMARK_REQUIRED      | Gate test          | PASS   |
| Sharpe/Sortino              | PASS            | returns/risk-free policy | versioned             | capability-aware        | Domain             | PASS   |
| VaR/CVaR                    | FEATURE_FLAGGED | sufficient observations  | limitations required  | unavailable when absent | Gate test          | PASS   |
