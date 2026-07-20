#!/usr/bin/env sh
set -eu

image="${1:?image reference is required}"
output="${2:-reports/security/container.sbom.spdx.json}"

mkdir -p "$(dirname "$output")"
docker scout sbom --format spdx --output "$output" "local://${image}"
test -s "$output"
echo "SBOM written to $output"
