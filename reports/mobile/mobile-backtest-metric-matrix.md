# Mobile Backtest Metric Matrix

| Metric                | Backend | Methodology              | Required Data    | Mobile | Tests         | Status               |
| --------------------- | ------- | ------------------------ | ---------------- | ------ | ------------- | -------------------- |
| Annualized return     | PASS    | day-count 365            | equity range     | PASS   | domain/API/UI | PASS                 |
| Annualized volatility | PASS    | sample, 252              | periodic returns | PASS   | domain/API/UI | PASS                 |
| Sharpe                | PASS    | explicit RF policy       | returns          | PASS   | domain/API/UI | PASS                 |
| Sortino               | PASS    | explicit downside target | downside returns | PASS   | domain/API/UI | PASS                 |
| Max drawdown          | PASS    | underwater curve         | equity           | PASS   | domain/API/UI | PASS                 |
| Calmar                | PASS    | CAGR / max drawdown      | return/drawdown  | PASS   | domain/API/UI | PASS                 |
| Expectancy            | PASS    | realized P/L / trades    | closed trades    | PASS   | domain/API/UI | PASS                 |
| Turnover              | PASS    | gross fills / avg equity | real fills       | PASS   | domain/API/UI | PASS_NON_PLACEHOLDER |
| Fees/slippage         | PASS    | explicit model/version   | fills            | PASS   | domain/API/UI | PASS                 |
| Benchmark/excess      | PASS    | exact-date intersection  | benchmark        | PASS   | domain/API/UI | PASS                 |
