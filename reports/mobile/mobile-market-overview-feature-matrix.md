# Mobile Market Overview Feature Matrix

| Section            | API                 | Provider | Mobile UI          | Loading  | Partial           | Error          | Tests         | Status    |
| ------------------ | ------------------- | -------- | ------------------ | -------- | ----------------- | -------------- | ------------- | --------- |
| Market status      | calendar capability | required | native card        | skeleton | explicit          | safe           | component/E2E | PASS      |
| Main/other indices | overview            | required | cards/chart        | skeleton | explicit          | provider state | component/E2E | PASS      |
| Breadth            | breadth             | required | labelled counts    | skeleton | excluded separate | safe           | unit/E2E      | PASS      |
| Movers             | rankings + cursor   | required | accessible rows    | skeleton | explicit          | section retry  | API/E2E       | PASS      |
| Sectors            | sectors             | required | signed ranked bars | skeleton | explicit          | provider state | API/E2E       | PASS      |
| Watchlist/alerts   | deferred            | n/a      | placeholder        | n/a      | n/a               | unavailable    | scope         | TASK-100F |
| Portfolio          | deferred            | n/a      | placeholder        | n/a      | n/a               | unavailable    | scope         | TASK-100G |
