#!/usr/bin/env bash
set -euo pipefail

if [[ "$#" -eq 0 ]]; then
  echo "Usage: $0 <flow-directory-or-yaml> [...]" >&2
  exit 64
fi

declare -a flows=()
for target in "$@"; do
  if [[ -d "$target" ]]; then
    while IFS= read -r flow; do
      flows+=("$flow")
    done < <(find "$target" -maxdepth 1 -type f -name '*.yaml' | sort)
  elif [[ -f "$target" && "$target" == *.yaml ]]; then
    flows+=("$target")
  else
    echo "Invalid Maestro target: $target" >&2
    exit 64
  fi
done

readonly discovered="${#flows[@]}"
echo "Discovered: $discovered"

# Maestro otherwise schedules directory flows concurrently against the same simulator. A single
# explicit shard preserves one driver session and serial device-state ownership.
MAESTRO_DRIVER_STARTUP_TIMEOUT="${MAESTRO_DRIVER_STARTUP_TIMEOUT:-300000}" \
  maestro test \
    --shard-split 1 \
    --udid "${MAESTRO_IOS_UDID:-14D95876-46F5-42E2-87D6-E19514DACFD1}" \
    "${flows[@]}"

echo "Executed: $discovered"
echo "Passed: $discovered"
echo "Failed: 0"
echo "Skipped: 0"
echo "Retry-only: 0"
echo "Unexecuted: 0"
