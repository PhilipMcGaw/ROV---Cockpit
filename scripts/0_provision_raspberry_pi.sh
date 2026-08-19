#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTROL_ROOT="${CONTROL_ROOT:-$PROJECT_ROOT/../ROV---Control}"
DATALOGGER_ROOT="${DATALOGGER_ROOT:-$PROJECT_ROOT/../ROV---Datalogger}"
ROBOT_PROFILE="${ROBOT_PROFILE:-rov}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

info() { echo "[INFO] $*"; }
pass() { echo "[PASS] $*"; }
warn() { echo "[WARN] $*"; }
fail() { echo "[FAIL] $*" >&2; exit 1; }

echo "[INFO] ROV Cockpit Raspberry Pi provisioning"
echo "[INFO] Project version: unversioned; see MASTER_CONTEXT.md"
echo "[INFO] Project directory: $PROJECT_ROOT"
echo "[INFO] Runtime: Debian system packages plus project-local Python environments"
echo "[INFO] Operating mode: initial Raspberry Pi platform and Cockpit deployment"
echo "[INFO] Components: Python, Node.js/npm, Nginx, Motion, NATS Server, Cockpit, Control, Datalogger, shared profile and networking"
echo "[INFO] Privileged actions: apt package installation, systemd service installation and service enablement"

[[ "$(uname -s)" == "Linux" ]] || fail "Unsupported operating system: $(uname -s). This script is for Raspberry Pi/Linux only."
[[ "${EUID}" -eq 0 ]] || fail "This provisioning script must run with sudo/root because it changes system packages and services. Run: sudo bash scripts/0_provision_raspberry_pi.sh"
[[ -f "$PROJECT_ROOT/requirements.txt" ]] || fail "Requirements file is missing: $PROJECT_ROOT/requirements.txt. Restore the Cockpit repository before continuing."
[[ -f "$PROJECT_ROOT/configs/cockpit.service" ]] || fail "Cockpit service file is missing: $PROJECT_ROOT/configs/cockpit.service. Restore the deployment files before continuing."
[[ -f "$DATALOGGER_ROOT/configs/datalogger.service" ]] || fail "Datalogger service file is missing: $DATALOGGER_ROOT/configs/datalogger.service. Clone Datalogger beside Cockpit or set DATALOGGER_ROOT."
[[ -f "$DATALOGGER_ROOT/requirements.txt" ]] || fail "Datalogger requirements are missing: $DATALOGGER_ROOT/requirements.txt. Restore the repository before continuing."
[[ -f "$CONTROL_ROOT/configs/python.service" ]] || fail "Control service file is missing: $CONTROL_ROOT/configs/python.service. Clone Control beside Cockpit or set CONTROL_ROOT."
[[ -f "$CONTROL_ROOT/requirements.txt" ]] || fail "Control requirements are missing: $CONTROL_ROOT/requirements.txt. Restore the repository before continuing."
command -v apt-get >/dev/null 2>&1 || fail "apt-get is unavailable. This script supports Debian-based Raspberry Pi operating systems only."

info "Refreshing Debian package metadata."
apt-get update || fail "apt-get update failed. Check network access, repository configuration, and system time."

info "Checking that all required platform packages are available before installation."
PACKAGES=(python3 python3-venv python3-dev nodejs npm nginx motion curl ca-certificates nats-server)
for package in "${PACKAGES[@]}"; do
  apt-cache show "$package" >/dev/null 2>&1 || fail "Required package is unavailable in the configured repositories: $package. Add a trusted repository or install this dependency using the documented vendor method before rerunning. No partial service configuration was attempted."
done
pass "All required Debian packages are available."

info "Installing Python, Node.js/npm, Nginx, Motion, curl, certificates and NATS Server."
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

info "Installing Datalogger dependencies and shared CSV export directory."
if [[ ! -d "$DATALOGGER_ROOT/.venv" ]]; then
  runuser -u "$PROJECT_USER" -- python3 -m venv "$DATALOGGER_ROOT/.venv" || fail "Could not create $DATALOGGER_ROOT/.venv for $PROJECT_USER."
fi
runuser -u "$PROJECT_USER" -- "$DATALOGGER_ROOT/.venv/bin/python" -m pip install --upgrade pip || fail "Could not update pip in $DATALOGGER_ROOT/.venv."
runuser -u "$PROJECT_USER" -- "$DATALOGGER_ROOT/.venv/bin/python" -m pip install -r "$DATALOGGER_ROOT/requirements.txt" || fail "Could not install Datalogger requirements."
install -d -o "$PROJECT_USER" -g "$PROJECT_GROUP" -m 0750 "$DATALOGGER_ROOT/data" "$PROJECT_ROOT/media/data/csv"
chown -R "$PROJECT_USER:$PROJECT_GROUP" "$DATALOGGER_ROOT/.venv" "$DATALOGGER_ROOT/data" "$PROJECT_ROOT/media"
pass "Datalogger Python environment and shared CSV directory configured."

info "Installing Control dependencies and hardware service environment."
if [[ ! -d "$CONTROL_ROOT/.venv" ]]; then
  runuser -u "$PROJECT_USER" -- python3 -m venv "$CONTROL_ROOT/.venv" || fail "Could not create $CONTROL_ROOT/.venv for $PROJECT_USER."
fi
runuser -u "$PROJECT_USER" -- "$CONTROL_ROOT/.venv/bin/python" -m pip install --upgrade pip || fail "Could not update pip in $CONTROL_ROOT/.venv."
runuser -u "$PROJECT_USER" -- "$CONTROL_ROOT/.venv/bin/python" -m pip install -r "$CONTROL_ROOT/requirements.txt" || fail "Could not install Control requirements."
chown -R "$PROJECT_USER:$PROJECT_GROUP" "$CONTROL_ROOT/.venv"
pass "Control Python environment installed for $PROJECT_USER."

info "Installing the Cockpit systemd unit."
install -o root -g root -m 0644 "$PROJECT_ROOT/configs/cockpit.service" /etc/systemd/system/cockpit.service || fail "Could not install /etc/systemd/system/cockpit.service."
install -o root -g root -m 0644 "$DATALOGGER_ROOT/configs/datalogger.service" /etc/systemd/system/datalogger.service || fail "Could not install /etc/systemd/system/datalogger.service."
install -o root -g root -m 0644 "$CONTROL_ROOT/configs/python.service" /etc/systemd/system/python.service || fail "Could not install /etc/systemd/system/python.service."
systemctl daemon-reload || fail "systemd daemon reload failed after installing the Cockpit unit."
systemctl enable nats-server nginx motion python cockpit datalogger || fail "Could not enable one or more services: nats-server, nginx, motion, python, cockpit, datalogger."
pass "Control, Cockpit, Datalogger, NATS Server, Nginx, and Motion are enabled for startup."

info "Installing the shared robot profile."
PROFILE_SOURCE="$PROJECT_ROOT/configs/profiles/${ROBOT_PROFILE}.json"
[[ -f "$PROFILE_SOURCE" ]] || fail "Robot profile is missing: $PROFILE_SOURCE. Set ROBOT_PROFILE to a valid profile name."
install -d -o root -g root -m 0755 /etc/robot
install -o root -g root -m 0644 "$PROFILE_SOURCE" /etc/robot/profile.json
python3 -m json.tool /etc/robot/profile.json >/dev/null || fail "The selected robot profile is not valid JSON: $PROFILE_SOURCE"
pass "Robot profile installed at /etc/robot/profile.json: $ROBOT_PROFILE"

if [[ -x "$CONTROL_ROOT/scripts/0_deploy_network.sh" ]]; then
  info "Invoking Control-owned networking, SMB and Avahi deployment."
  NETWORK_CONFIG="${NETWORK_CONFIG:-$CONTROL_ROOT/configs/network.env}" \
  NETWORK_SECRETS="${NETWORK_SECRETS:-$CONTROL_ROOT/configs/network.secrets.env}" \
    "$CONTROL_ROOT/scripts/0_deploy_network.sh" || fail "Control networking deployment failed. Review its diagnostics before continuing."
  pass "Control-owned networking deployment completed."
else
  warn "Control networking script not found at $CONTROL_ROOT/scripts/0_deploy_network.sh; networking, SMB and Avahi were not deployed. Set CONTROL_ROOT or deploy Control separately."
fi

info "Testing NATS Server availability before configuring the reverse proxy."
systemctl is-active --quiet nats-server || systemctl start nats-server || fail "NATS Server did not start. Inspect: journalctl -u nats-server -n 50 --no-pager"
curl --fail --silent --show-error http://127.0.0.1:8222/varz >/dev/null 2>&1 || warn "NATS monitoring endpoint is not available at port 8222; service status is active but connectivity is not fully verified."

info "Applying the Nginx site and map-tile cache configuration."
bash "$PROJECT_ROOT/scripts/3_configure_nginx.sh" || fail "Nginx configuration helper failed. Review its diagnostics; the previous site backup remains available."

info "Starting Cockpit and checking service state."
systemctl restart cockpit || fail "Cockpit failed to start. Inspect: journalctl -u cockpit -n 50 --no-pager"
systemctl restart datalogger || fail "Datalogger failed to start. Inspect: journalctl -u datalogger -n 50 --no-pager"
systemctl restart python || fail "Control failed to start. Inspect: journalctl -u python -n 50 --no-pager"
systemctl is-active --quiet cockpit || fail "Cockpit is not active after restart. Inspect: journalctl -u cockpit -n 50 --no-pager"
systemctl is-active --quiet datalogger || fail "Datalogger is not active after provisioning. Inspect: journalctl -u datalogger -n 50 --no-pager"
systemctl is-active --quiet python || fail "Control is not active after provisioning. Inspect: journalctl -u python -n 50 --no-pager"
systemctl is-active --quiet nginx || fail "Nginx is not active after provisioning. Inspect: journalctl -u nginx -n 50 --no-pager"
systemctl is-active --quiet nats-server || fail "NATS Server is not active after provisioning. Inspect: journalctl -u nats-server -n 50 --no-pager"
pass "Control, Cockpit, Datalogger, Nginx and NATS Server are active."

echo "[INFO] Environment summary:"
echo "[INFO] Python=installed and configured; Nginx=installed, configured and active; Motion=installed and enabled; NATS Server=installed, enabled and active; Cockpit=installed, enabled and active; Datalogger=installed, enabled and active; CSV export=shared with Cockpit media/SMB."
echo "[WARN] Hardware cameras, motor controllers, sensors, network links and ROV operation are not physically validated by this script."
echo "[INFO] Provisioning completed at $TIMESTAMP."
