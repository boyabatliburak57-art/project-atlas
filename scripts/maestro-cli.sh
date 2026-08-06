#!/bin/sh
set -eu

MAESTRO_BIN="${MAESTRO_BIN:-$HOME/.maestro/bin/maestro}"

if [ ! -x "$MAESTRO_BIN" ]; then
  echo "Maestro executable not found: $MAESTRO_BIN" >&2
  exit 127
fi

exec "$MAESTRO_BIN" "$@"
