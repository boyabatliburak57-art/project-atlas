#!/usr/bin/env bash
set -euo pipefail

project="${ALERTS_PERF_COMPOSE_PROJECT:-atlas-alerts-performance}"
postgres_port="${ALERTS_PERF_POSTGRES_PORT:-55434}"
redis_port="${ALERTS_PERF_REDIS_PORT:-56381}"
database="atlas_alerts_performance_test"
user="atlas"
password="atlas-alerts-performance-local"

pnpm --filter @atlas/domain build
pnpm --filter @atlas/database build

cleanup() {
  POSTGRES_DB=atlas_alerts_performance POSTGRES_USER="$user" POSTGRES_PASSWORD="$password" \
    POSTGRES_PORT="$postgres_port" REDIS_PORT="$redis_port" \
    docker compose -p "$project" down -v >/dev/null 2>&1 || true
}
trap cleanup EXIT

POSTGRES_DB=atlas_alerts_performance POSTGRES_USER="$user" POSTGRES_PASSWORD="$password" \
  POSTGRES_PORT="$postgres_port" REDIS_PORT="$redis_port" \
  docker compose -p "$project" up -d --wait

docker exec "${project}-postgres-1" createdb -U "$user" "$database"

TEST_DATABASE_URL="postgresql://${user}:${password}@127.0.0.1:${postgres_port}/${database}" \
  pnpm --filter @atlas/worker perf:alerts -- "$@"
