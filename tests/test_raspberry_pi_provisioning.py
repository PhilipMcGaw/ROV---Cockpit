"""Static deployment-contract checks for the co-installed Raspberry Pi services."""

from pathlib import Path


COCKPIT_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = COCKPIT_ROOT.parent
CONTROL_ROOT = WORKSPACE_ROOT / "ROV---Control"
DATALOGGER_ROOT = WORKSPACE_ROOT / "ROV---Datalogger"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_provisioner_installs_the_required_platform_contract() -> None:
    provisioner = read(COCKPIT_ROOT / "scripts" / "0_provision_raspberry_pi.sh")

    for required in (
        "network-manager",
        "dnsmasq-base",
        "avahi-daemon",
        "samba",
        "install_nats_configuration",
        "render_template \"$PROJECT_ROOT/configs/cockpit.service\"",
        "render_template \"$CONTROL_ROOT/configs/python.service\"",
        "render_template \"$DATALOGGER_ROOT/configs/datalogger.service\"",
        "NETWORK_CONFIG=\"$NETWORK_CONFIG_FILE\"",
        "NETWORK_SECRETS=\"$NETWORK_SECRETS_FILE\"",
        "NETWORK_SECRETS_MODE",
        "NATS_URL=nats://%s:%s@127.0.0.1:4222",
    ):
        assert required in provisioner


def test_service_templates_are_portable_and_use_the_restricted_nats_environment() -> None:
    cockpit_unit = read(COCKPIT_ROOT / "configs" / "cockpit.service")
    control_unit = read(CONTROL_ROOT / "configs" / "python.service")
    datalogger_unit = read(DATALOGGER_ROOT / "configs" / "datalogger.service")

    assert "@COCKPIT_ROOT@" in cockpit_unit
    assert "@CONTROL_ROOT@" in control_unit
    assert "@DATALOGGER_ROOT@" in datalogger_unit
    assert 'ExecStart=/bin/bash "@COCKPIT_ROOT@/run.sh"' in cockpit_unit
    assert 'ExecStart="@CONTROL_ROOT@/.venv/bin/python"' in control_unit
    assert 'ExecStart="@DATALOGGER_ROOT@/.venv/bin/python"' in datalogger_unit
    for unit in (cockpit_unit, control_unit, datalogger_unit):
        assert "EnvironmentFile=-/etc/robot/nats.env" in unit
        assert "/home/pi/" not in unit


def test_network_deployment_supports_named_profiles_and_wifi_fallback() -> None:
    network_script = read(CONTROL_ROOT / "scripts" / "0_deploy_network.sh")
    network_example = read(CONTROL_ROOT / "configs" / "network.env.example")
    secret_example = read(CONTROL_ROOT / "configs" / "network.secrets.example")

    for required in (
        "WIRED_CONNECTION_NAME",
        "WIFI_CLIENTS",
        "connection.autoconnect-priority",
        "systemctl enable --now NetworkManager",
        "nmcli connection reload",
        "dry-run does not query live NetworkManager interfaces",
        "ipv4.method shared",
        "FALLBACK_ROBOT_ADDRESS",
        "SMB_SHARE_NAME",
    ):
        assert required in network_script
    assert "FALLBACK_ROBOT_ADDRESS=192.168.42.1/24" in network_example
    assert "FALLBACK_NETWORK=" not in network_example
    assert "WIRED_STATIC_ADDRESS=" in network_example
    assert "WIFI_CLIENTS=(preferred)" in secret_example
    assert "NATS_USERNAME=replace-me" in secret_example


def test_control_runtime_launcher_derives_its_own_path() -> None:
    launcher = read(CONTROL_ROOT / "run.sh")

    assert "BASH_SOURCE[0]" in launcher
    assert "/home/pi/ROV---Control" not in launcher
    assert "PYTHONPATH=\"$PROJECT_ROOT/src" in launcher


def test_rendered_nginx_and_motion_configuration_do_not_assume_a_checkout_path() -> None:
    nginx_template = read(COCKPIT_ROOT / "configs" / "nginx.conf")
    nginx_installer = read(COCKPIT_ROOT / "scripts" / "3_configure_nginx.sh")
    motion_template = read(COCKPIT_ROOT / "configs" / "motion.conf")

    assert "@COCKPIT_ROOT@" in nginx_template
    assert 'alias "@COCKPIT_ROOT@/src/rov_cockpit/static/";' in nginx_template
    assert "COCKPIT_ROOT_ESCAPED" in nginx_installer
    assert "@COCKPIT_ROOT@" in motion_template


def main() -> int:
    checks = (
        test_provisioner_installs_the_required_platform_contract,
        test_service_templates_are_portable_and_use_the_restricted_nats_environment,
        test_network_deployment_supports_named_profiles_and_wifi_fallback,
        test_control_runtime_launcher_derives_its_own_path,
        test_rendered_nginx_and_motion_configuration_do_not_assume_a_checkout_path,
    )
    for check in checks:
        check()
    print(f"[PASS] Raspberry Pi provisioning contract audit passed for {len(checks)} checks.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
