# TASK-110F3 Focused Worker / API Result

## Contract and API

- Active measures: PASS.
- Measure history: PASS.
- Market-wide projection: PASS; one reader call, no symbol fan-out.
- Short-selling capability state: PASS.
- Symbol summary: PASS.
- Bad cursor, oversized range, invalid filter: safe rejection PASS.
- Canonical MarketMeasure revision → MarketEvent relation: PASS.
- Raw provider payload exposure: 0.

## Worker and PostgreSQL smoke

- `MARKET_MEASURE_SYNC` registration and ingestion service: 14/14 PASS.
- Real PostgreSQL MarketMeasure persistence/revision/dedup/event/short-selling smoke: 12/12 PASS.
- Real PostgreSQL partial-commit MarketEvent repair smoke: 1/1 PASS.
- Duplicate records/events: 0.
- Tables added by TASK-110F3: 0.
