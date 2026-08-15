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

# A single release-wide Maestro invocation can retain old Expo Router accessibility nodes. Run one
# driver session per YAML so route state is isolated. The scoped cleanup below bounds reproducible
# XCUITest artifacts before each fresh driver install, preventing stale input state and disk growth.
readonly ios_udid="${MAESTRO_IOS_UDID:-14D95876-46F5-42E2-87D6-E19514DACFD1}"
readonly maestro_temp_root="$(getconf DARWIN_USER_TEMP_DIR)"

cleanup_maestro_driver_temp() {
  case "$maestro_temp_root" in
    /var/folders/*/T/) ;;
    *)
      echo "Refusing to clean unexpected Darwin temp root: $maestro_temp_root" >&2
      exit 70
      ;;
  esac
  find "$maestro_temp_root" -mindepth 1 -maxdepth 1 -type d \
    \( -name "${ios_udid}*" -o -name 'maestro_xctestrunner_*' \) \
    -exec rm -rf -- {} +
  if [[ -n "${MAESTRO_TEST_OUTPUT_ROOT:-}" ]]; then
    case "$MAESTRO_TEST_OUTPUT_ROOT" in
      /Users/*/.maestro/tests) ;;
      *)
        echo "Refusing to clean unexpected Maestro output root: $MAESTRO_TEST_OUTPUT_ROOT" >&2
        exit 70
        ;;
    esac
    find "$MAESTRO_TEST_OUTPUT_ROOT" -mindepth 1 -maxdepth 1 -type d \
      -exec rm -rf -- {} +
  fi
}

passed=0
for flow in "${flows[@]}"; do
  cleanup_maestro_driver_temp
  xcrun simctl terminate "$ios_udid" com.atlasfinance.mobile >/dev/null 2>&1 || true
  if ! MAESTRO_DRIVER_STARTUP_TIMEOUT="${MAESTRO_DRIVER_STARTUP_TIMEOUT:-300000}" \
    maestro test --udid "$ios_udid" "$flow"; then
    executed=$((passed + 1))
    echo "Executed: $executed"
    echo "Passed: $passed"
    echo "Failed: 1"
    echo "Skipped: 0"
    echo "Retry-only: 0"
    echo "Unexecuted: $((discovered - executed))"
    exit 1
  fi
  passed=$((passed + 1))
done

echo "Executed: $discovered"
echo "Passed: $discovered"
echo "Failed: 0"
echo "Skipped: 0"
echo "Retry-only: 0"
echo "Unexecuted: 0"
