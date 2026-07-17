#!/usr/bin/env bash
set -euo pipefail

project="${PORTFOLIO_PERF_COMPOSE_PROJECT:-atlas-portfolio-performance}"
postgres_port="${PORTFOLIO_PERF_POSTGRES_PORT:-55435}"
redis_port="${PORTFOLIO_PERF_REDIS_PORT:-56382}"
database="atlas_portfolio_performance_test"
user="atlas"
password="atlas-portfolio-performance-local"

pnpm --filter @atlas/domain build
pnpm --filter @atlas/database build
pnpm --filter @atlas/api build

cleanup() {
  POSTGRES_DB=atlas_portfolio_performance POSTGRES_USER="$user" POSTGRES_PASSWORD="$password" \
    POSTGRES_PORT="$postgres_port" REDIS_PORT="$redis_port" \
    docker compose -p "$project" down -v >/dev/null 2>&1 || true
}
trap cleanup EXIT

POSTGRES_DB=atlas_portfolio_performance POSTGRES_USER="$user" POSTGRES_PASSWORD="$password" \
  POSTGRES_PORT="$postgres_port" REDIS_PORT="$redis_port" \
  docker compose -p "$project" up -d --wait

database_created=false
for _attempt in $(seq 1 30); do
  if docker exec "${project}-postgres-1" createdb -U "$user" "$database"; then
    database_created=true
    break
  fi
  sleep 1
done
if [[ "$database_created" != "true" ]]; then
  echo "Portfolio performance database did not become ready" >&2
  exit 1
fi

set +e
TEST_DATABASE_URL="postgresql://${user}:${password}@127.0.0.1:${postgres_port}/${database}" \
REDIS_URL="redis://127.0.0.1:${redis_port}" \
  pnpm --filter @atlas/worker perf:portfolio -- "$@"
benchmark_status=$?
set -e

pnpm exec prettier --write \
  reports/performance/portfolio-risk-*.json \
  reports/performance/portfolio-risk-*.md

exit "$benchmark_status"
