#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "This script targets Linux/Raspberry Pi systems." >&2
  exit 1
fi

"$PROJECT_ROOT/scripts/build_frontend.sh"

if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files cockpit.service >/dev/null 2>&1; then
  if [[ "${EUID}" -ne 0 ]]; then exec sudo bash "$0" "$@"; fi
  systemctl restart motion cockpit nginx
  systemctl --no-pager --full status motion cockpit nginx || true
  echo "Cockpit should be available at: http://$(hostname -I | awk '{print $1}')/"
  exit 0
fi

PYTHON="$PROJECT_ROOT/.venv/bin/python"
if [[ ! -x "$PYTHON" ]]; then
  echo "Cockpit environment not found. Run scripts/1_install_dependencies.sh first." >&2
  exit 1
fi

cd "$PROJECT_ROOT"
exec env PYTHONPATH=src "$PYTHON" -m uvicorn rov_cockpit.app:app --host 0.0.0.0 --port 8080
