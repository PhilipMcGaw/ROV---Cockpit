# ROV Cockpit Master Context

## Purpose

The ROV Cockpit is the operator-facing FastAPI web application. It provides view-only monitoring by default, authenticated driver/admin workflows, camera and media controls, telemetry visualisation, and browser gamepad configuration.

## Repository boundary

This repository contains the Cockpit web layer only. ROV propulsion/control remains a separate service and communicates through the configured MQTT boundary. Data logging and HiL/SiL work are separate repositories.

## Layout

- `src/rov_cockpit/` — Python package, templates, and static assets.
- `configs/` — deployment, camera, media, authentication-template, and reverse-proxy configuration.
- `docs/` — operational and engineering documentation.
- `tests/` — Cockpit tests and test guidance.

Camera and media ownership belongs to Cockpit: camera inventory, Motion configuration, Nginx reverse-proxy configuration, still capture, rolling video retention, gallery, and downloads are maintained here. The original monolithic ROV repository must not contain duplicate camera or Nginx configuration.

The Cockpit `/data/` page reads CSV exports from `CSV_ROOT` (default `<project>/data/csv`), permits selection of CSV sensor fields, displays a bounded preview and provides filtered downloads without modifying the source file. Datalogger storage and export production remain Datalogger responsibilities.

The live Cockpit instrument row includes the existing compass, attitude and depth indicators, plus a separate pitch-only attitude indicator for nose-up/nose-down inclination. It uses the NATS subject `sensor.ahrs.imu.pitch` and displays unavailable or non-numeric values without inventing a measurement.

The live instrument row also includes a separate camera inclination indicator. It consumes `sensor/camera/main/pitch`, expressed in degrees relative to the ROV body, where `0°` is straight ahead. The camera-control implementation is responsible for converting its physical 90° servo home position into this representation. The topic and physical correspondence require bench validation before the value is treated as measured camera orientation.

The map supports optional Raspberry Pi Nginx tile caching through `MAP_TILE_PROXY=true` for mobile-link deployments. Local Windows development uses direct provider URLs by default.
- `requirements.txt` — runtime dependencies, following the project’s TiaB-style dependency workflow.
- `scripts/` — Windows portable WinPython installation and startup scripts, the project-local POSIX dependency installer, Raspberry Pi provisioning, and the Nginx configuration helper.

## Runtime rules

- Run with FastAPI/Uvicorn on port `8080`.
- Use `PYTHONPATH=src` and the package entry point `rov_cockpit.app:app`.
- Browser clients receive telemetry through the Cockpit WebSocket; they do not connect directly to NATS.
- Cockpit uses NATS Core at `NATS_URL` (default `nats://127.0.0.1:4222`) and subscribes to `NATS_SUBJECT` (default `>`). NATS subjects use dots; dashboard keys retain slash notation through the transport adapter.
- If NATS is unavailable during startup, Cockpit reports a warning and remains available for view-only UI development; live telemetry and control are unavailable until NATS is configured.
- NATS library connection tracebacks are suppressed in this expected read-only condition; the Cockpit warning remains the authoritative status message.
- Anonymous users remain view-only. Driver/admin access is authenticated.
- Do not make the Cockpit the only propulsion safety layer; neutral, timeout, and emergency-stop behaviour belongs in the control service.
- Keep paths repository-relative through `PROJECT_ROOT`; do not reintroduce assumptions about the original monolithic ROV folder.
- On Windows, use `scripts/1_install_dependencies.bat` followed by `scripts/2_start_app.bat`. These require a local or mapped drive, install portable Python without administrator rights, and do not use `uv`.

## Documentation-sync rule

Any change to routes, authentication, deployment, configuration, dependencies, media behaviour, or repository boundaries must update the relevant `docs/` file and this `MASTER_CONTEXT.md` in the same change. Every change must include a consistency check of this file; if it is not a true reflection of current behaviour, correct it immediately. Documentation must remain current, use formal British English, and be written for readers with an engineering degree or equivalent technical experience.

Where SI units are used, place a space between the numerical value and the unit symbol, for example `5 m`, `12 V`, and `20 °C`. Use the degree symbol `°` by preference for angles.

## Windows scripting and deployment standard

Future Windows batch, PowerShell, and launcher scripts must use a deliberately verbose diagnostic style with formal British English, explicit `[INFO]`, `[PASS]`, `[WARN]`, `[FAIL]`, and `[SKIP]` labels, and an initial project/environment summary. Scripts must derive absolute paths from their own location, resolve tools and DLLs from project-relative paths, avoid modifying PATH, the registry, system directories, or machine-wide locations, and require no administrator rights unless a documented third-party driver or SDK explicitly requires them.

The same rules apply to POSIX shell scripts on macOS, Linux, and Raspberry Pi. Shell scripts must use strict error handling, derive paths from the script location, avoid unapproved system changes, validate prerequisites, check important command exit statuses, preserve diagnostic information after failure, and report the final environment state clearly.

The Raspberry Pi deployment helper `scripts/3_configure_nginx.sh` is the supported repeatable method for installing the Cockpit reverse-proxy configuration. It may require `sudo` because it changes system Nginx and systemd state; it must back up an existing site configuration before replacement, validate Nginx before reload, and report the resulting service and cache state.

The separate `scripts/0_provision_raspberry_pi.sh` is the supported initial Debian-based Raspberry Pi provisioning path. It installs only the currently evidenced platform dependencies and NATS package, creates the Cockpit virtual environment, installs the Cockpit systemd unit, and enables/checks the services. If NATS is not available from configured trusted Debian repositories, it must stop and report the condition rather than use an unverified installer. `scripts/1_install_dependencies.sh` remains project-local and must not install system packages or services.

Scripts must reject unsupported direct UNC execution where local paths are required, validate prerequisites before dependent operations, check important external-command exit statuses, fail early with the path, consequence, and corrective action, be safe to rerun where practical, and avoid deleting or overwriting user data. Temporary files must be project-local and cleaned after success or preserved with a diagnostic path after failure. Downloads must be verified using an explicit checksum or trusted manifest where available. Vendor DLLs, SDKs, and installers remain optional or unverified until their presence and operation are confirmed, and native DLL architecture must match the active Python architecture. Output must distinguish installed, detected, available, configured, connected, bench tested, and physically validated states, and finish with an environment summary showing every check.
