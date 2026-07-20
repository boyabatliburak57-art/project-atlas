#!/usr/bin/env sh
set -eu

image="${1:?image reference is required}"
output="${2:-reports/security/container-vulnerabilities.sarif}"

mkdir -p "$(dirname "$output")"
docker run --rm \
  -e TRIVY_DB_REPOSITORY=ghcr.io/aquasecurity/trivy-db:2 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v atlas-trivy-cache:/root/.cache/trivy \
  -v "$PWD:/workspace" \
  aquasec/trivy:0.69.3 image \
  --exit-code 1 \
  --ignore-unfixed \
  --scanners vuln \
  --severity CRITICAL,HIGH \
  --format sarif \
  --no-progress \
  --skip-version-check \
  --output "/workspace/$output" \
  "$image"
echo "Container vulnerability scan passed; report written to $output"
