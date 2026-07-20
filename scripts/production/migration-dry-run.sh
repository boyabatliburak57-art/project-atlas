#!/usr/bin/env sh
set -eu

: "${DATABASE_URL:?DATABASE_URL is required for migration dry-run}"

export PGOPTIONS="${PGOPTIONS:--c lock_timeout=5000 -c statement_timeout=120000}"

pnpm --filter @atlas/database db:check
pnpm --filter @atlas/database db:migrate
pnpm --filter @atlas/database test:integration

echo 'Migration dry-run and invariant validation passed.'
