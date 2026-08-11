#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV="$PROJECT_ROOT/.venv"

info() { echo "[INFO] $*"; }
pass() { echo "[PASS] $*"; }
fail() { echo "[FAIL] $*" >&2; exit 1; }

echo "[INFO] ROV Cockpit project dependency installation"
echo "[INFO] Project directory: $PROJECT_ROOT"
echo "[INFO] Runtime: project-local Python virtual environment"
echo "[INFO] Operating mode: local dependency installation; no system services are changed"
echo "[INFO] Requirements: $PROJECT_ROOT/requirements.txt"

[[ "$(uname -s)" == "Linux" || "$(uname -s)" == "Darwin" ]] || fail "Unsupported operating system: $(uname -s). Use the Windows batch installer on Windows."
[[ -f "$PROJECT_ROOT/requirements.txt" ]] || fail "Requirements file is missing: $PROJECT_ROOT/requirements.txt. Restore the repository before continuing."
command -v python3 >/dev/null 2>&1 || fail "Python 3 is unavailable. Install Python 3 using the supported operating-system method, then rerun this script."

if [[ "$(uname -s)" == "Linux" && "${EUID}" -eq 0 ]]; then
  fail "This project-local installer must not run as root. Run it as the normal runtime user; use 0_provision_raspberry_pi.sh for documented privileged setup."
fi

info "Creating or reusing the project-local Python environment: $VENV"
python3 -m venv "$VENV"
"$VENV/bin/python" -m pip install --upgrade pip || fail "Python packaging bootstrap failed in $VENV. Check network access and filesystem permissions."
"$VENV/bin/python" -m pip install -r "$PROJECT_ROOT/requirements.txt" || fail "Python dependency installation failed from $PROJECT_ROOT/requirements.txt. Review the pip diagnostics above."
pass "Cockpit Python dependencies installed locally. No system packages or services were changed."
