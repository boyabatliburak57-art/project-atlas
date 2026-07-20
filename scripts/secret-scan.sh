#!/usr/bin/env bash

set -euo pipefail

readonly repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly mode="${1:---all}"
readonly gitleaks_binary="$(bash "$repository_root/scripts/install-gitleaks.sh")"
readonly common_arguments=(
  --config "$repository_root/.gitleaks.toml"
  --gitleaks-ignore-path "$repository_root/.gitleaksignore"
  --redact=100
  --no-banner
  --exit-code 1
)

if [[ ! -x "$gitleaks_binary" ]]; then
  echo 'Pinned Gitleaks binary is unavailable or not executable.' >&2
  exit 1
fi

scan_working_tree() {
  (
    cd "$repository_root"
    "$gitleaks_binary" dir . "${common_arguments[@]}"
  )
}

scan_git_history() {
  if ! git -C "$repository_root" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo 'Git history scan requires a Git worktree.' >&2
    exit 1
  fi
  (
    cd "$repository_root"
    "$gitleaks_binary" git . "${common_arguments[@]}"
  )
}

case "$mode" in
  --all)
    scan_working_tree
    scan_git_history
    ;;
  --working-tree) scan_working_tree ;;
  --history) scan_git_history ;;
  *)
    echo 'Usage: secret-scan.sh [--all|--working-tree|--history]' >&2
    exit 2
    ;;
esac
