#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV="$PROJECT_ROOT/.venv"

if [[ "$(uname -s)" != "Linux" && "$(uname -s)" != "Darwin" ]]; then
  echo "This script supports Linux/Raspberry Pi and macOS." >&2
  exit 1
fi

if [[ "$(uname -s)" == "Linux" && "${EUID}" -eq 0 ]]; then
  echo "Run this script as the normal runtime user, not root." >&2
  exit 1
fi

python3 -m venv "$VENV"
"$VENV/bin/python" -m pip install --upgrade pip
"$VENV/bin/python" -m pip install -r "$PROJECT_ROOT/requirements.txt"

if [[ "$(uname -s)" == "Linux" && "$(id -u)" -ne 0 && -x "$(command -v sudo || true)" ]]; then
  sudo apt-get update
  sudo apt-get install -y nginx motion python3-dev
  echo "NATS Core must be installed and configured separately."
fi

echo "Cockpit dependencies installed."
