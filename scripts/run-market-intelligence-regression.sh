#!/usr/bin/env bash
set -euo pipefail

pnpm --filter @atlas/domain test -- \
  src/market-intelligence/cache-quality-runtime.test.ts \
  src/market-intelligence/market-snapshot-generation-service.test.ts
pnpm --filter @atlas/worker test -- src/queue/queue-contracts.test.ts
pnpm --filter @atlas/domain build
pnpm --filter @atlas/api test -- \
  src/market/market-overview.integration.test.ts \
  src/symbols/symbol-detail.integration.test.ts \
  src/fundamentals/fundamentals.integration.test.ts \
  src/patterns/patterns.integration.test.ts
pnpm perf:market
