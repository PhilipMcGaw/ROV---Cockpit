#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
printf '%s\n' '[INFO] TypeScript frontend build'
NPM="${PROJECT_ROOT}/node-runtime/bin/npm"
if [[ ! -x "$NPM" ]] && command -v npm >/dev/null 2>&1; then NPM="$(command -v npm)"; fi
if [[ ! -x "$NPM" ]]; then
  printf '%s\n' '[WARN] npm was not found; retaining the existing compiled frontend in static/dist.'
  exit 0
fi
"$NPM" --prefix "${PROJECT_ROOT}" install --no-audit --no-fund
"$NPM" --prefix "${PROJECT_ROOT}" run build
printf '%s\n' '[PASS] TypeScript frontend compiled successfully.'
