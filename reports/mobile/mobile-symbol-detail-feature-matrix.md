# Mobile Symbol Detail Feature Matrix

| Capability              | Backend | Provider                   | Mobile                        | Accessibility            | Tests    | Status    |
| ----------------------- | ------- | -------------------------- | ----------------------------- | ------------------------ | -------- | --------- |
| Header/quote            | READY   | required                   | native                        | labels/freshness         | unit/E2E | PASS      |
| Candlestick/line/volume | READY   | required                   | native RN views               | summary + point controls | unit/E2E | PASS      |
| Indicators              | READY   | required                   | selector, max 6               | labelled controls        | unit/E2E | PASS      |
| Raw/adjusted            | READY   | corporate actions required | raw; adjusted gated           | methodology              | unit     | PASS      |
| Fundamentals            | READY   | required                   | revision-aware/provider state | structured text          | E2E      | PASS      |
| Patterns                | READY   | required                   | state cards                   | no-look-ahead text       | E2E      | PASS      |
| Insights/company        | READY   | content required           | safe empty/metadata           | headings/URLs            | unit/E2E | PASS      |
| Watchlist/alert actions | READY   | n/a                        | unavailable link              | labelled                 | scope    | TASK-100F |
