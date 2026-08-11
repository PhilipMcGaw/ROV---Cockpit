#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

info() { echo "[INFO] $*"; }
pass() { echo "[PASS] $*"; }
warn() { echo "[WARN] $*"; }
fail() { echo "[FAIL] $*" >&2; exit 1; }

echo "[INFO] ROV Cockpit Raspberry Pi provisioning"
echo "[INFO] Project version: unversioned; see MASTER_CONTEXT.md"
echo "[INFO] Project directory: $PROJECT_ROOT"
echo "[INFO] Runtime: Debian system packages plus project-local Python environment"
echo "[INFO] Operating mode: initial Raspberry Pi platform and Cockpit deployment"
echo "[INFO] Components: Python, Nginx, Motion, NATS Server, Cockpit systemd service"
echo "[INFO] Privileged actions: apt package installation, systemd service installation and service enablement"

[[ "$(uname -s)" == "Linux" ]] || fail "Unsupported operating system: $(uname -s). This script is for Raspberry Pi/Linux only."
[[ "${EUID}" -eq 0 ]] || fail "This provisioning script must run with sudo/root because it changes system packages and services. Run: sudo bash scripts/0_provision_raspberry_pi.sh"
[[ -f "$PROJECT_ROOT/requirements.txt" ]] || fail "Requirements file is missing: $PROJECT_ROOT/requirements.txt. Restore the Cockpit repository before continuing."
[[ -f "$PROJECT_ROOT/configs/cockpit.service" ]] || fail "Cockpit service file is missing: $PROJECT_ROOT/configs/cockpit.service. Restore the deployment files before continuing."
command -v apt-get >/dev/null 2>&1 || fail "apt-get is unavailable. This script supports Debian-based Raspberry Pi operating systems only."

info "Refreshing Debian package metadata."
apt-get update || fail "apt-get update failed. Check network access, repository configuration, and system time."

info "Checking that all required platform packages are available before installation."
PACKAGES=(python3 python3-venv python3-dev nginx motion curl ca-certificates nats-server)
for package in "${PACKAGES[@]}"; do
  apt-cache show "$package" >/dev/null 2>&1 || fail "Required package is unavailable in the configured repositories: $package. Add a trusted repository or install this dependency using the documented vendor method before rerunning. No partial service configuration was attempted."
done
pass "All required Debian packages are available."

info "Installing Python, Nginx, Motion, curl, certificates and NATS Server."
apt-get install -y "${PACKAGES[@]}" || fail "Platform package installation failed. Review the apt diagnostics above; services have not been configured by this script."
pass "Platform packages installed or already present."

info "Creating the project-local Python environment and installing Cockpit requirements."
if [[ "${SUDO_USER:-}" != "" && "${SUDO_USER}" != "root" ]]; then
  PROJECT_USER="$SUDO_USER"
else
  PROJECT_USER="$(stat -c '%U' "$PROJECT_ROOT")"
fi
PROJECT_GROUP="$(id -gn "$PROJECT_USER")"
if [[ ! -d "$PROJECT_ROOT/.venv" ]]; then
  runuser -u "$PROJECT_USER" -- python3 -m venv "$PROJECT_ROOT/.venv" || fail "Could not create $PROJECT_ROOT/.venv for $PROJECT_USER. Check repository ownership and Python venv support."
fi
runuser -u "$PROJECT_USER" -- "$PROJECT_ROOT/.venv/bin/python" -m pip install --upgrade pip || fail "Could not update pip in $PROJECT_ROOT/.venv."
runuser -u "$PROJECT_USER" -- "$PROJECT_ROOT/.venv/bin/python" -m pip install -r "$PROJECT_ROOT/requirements.txt" || fail "Could not install Cockpit requirements from $PROJECT_ROOT/requirements.txt."
chown -R "$PROJECT_USER:$PROJECT_GROUP" "$PROJECT_ROOT/.venv"
pass "Cockpit Python environment installed for $PROJECT_USER."

info "Installing the Cockpit systemd unit."
install -o root -g root -m 0644 "$PROJECT_ROOT/configs/cockpit.service" /etc/systemd/system/cockpit.service || fail "Could not install /etc/systemd/system/cockpit.service."
systemctl daemon-reload || fail "systemd daemon reload failed after installing the Cockpit unit."
systemctl enable nats-server nginx motion cockpit || fail "Could not enable one or more services: nats-server, nginx, motion, cockpit."
pass "Cockpit, NATS Server, Nginx and Motion are enabled for startup."

info "Testing NATS Server availability before configuring the reverse proxy."
systemctl is-active --quiet nats-server || systemctl start nats-server || fail "NATS Server did not start. Inspect: journalctl -u nats-server -n 50 --no-pager"
curl --fail --silent --show-error http://127.0.0.1:8222/varz >/dev/null 2>&1 || warn "NATS monitoring endpoint is not available at port 8222; service status is active but connectivity is not fully verified."

info "Applying the Nginx site and map-tile cache configuration."
bash "$PROJECT_ROOT/scripts/3_configure_nginx.sh" || fail "Nginx configuration helper failed. Review its diagnostics; the previous site backup remains available."

info "Starting Cockpit and checking service state."
systemctl restart cockpit || fail "Cockpit failed to start. Inspect: journalctl -u cockpit -n 50 --no-pager"
systemctl is-active --quiet cockpit || fail "Cockpit is not active after restart. Inspect: journalctl -u cockpit -n 50 --no-pager"
systemctl is-active --quiet nginx || fail "Nginx is not active after provisioning. Inspect: journalctl -u nginx -n 50 --no-pager"
systemctl is-active --quiet nats-server || fail "NATS Server is not active after provisioning. Inspect: journalctl -u nats-server -n 50 --no-pager"
pass "Cockpit, Nginx and NATS Server are active."

echo "[INFO] Environment summary:"
echo "[INFO] Python=installed and configured; Nginx=installed, configured and active; Motion=installed and enabled; NATS Server=installed, enabled and active; Cockpit=installed, enabled and active."
echo "[WARN] Hardware cameras, motor controllers, sensors, network links and ROV operation are not physically validated by this script."
echo "[INFO] Provisioning completed at $TIMESTAMP."
