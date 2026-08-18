# ROV Cockpit Master Context

Interactive command examples assume Zsh. Shell scripts may use the interpreter declared by their shebang; documentation must keep interactive commands Zsh-compatible and identify any script-specific interpreter requirements.

## Purpose

The ROV Cockpit is the operator-facing FastAPI web application. It provides view-only monitoring by default, authenticated driver/admin workflows, camera and media controls, telemetry visualisation, and browser gamepad configuration.

## Repository boundary

On Linux, the documented default is for sibling repositories to be cloned directly below the user home directory, for example `~/ROV - Cockpit`, `~/ROV - Control`, `~/ROV - Datalogger`, and `~/ROV - HiL and SiL`. On macOS, place them in a user-selected workspace beneath the home directory, for example `~/Projects/ROV/`. Scripts must still derive paths from their own location and must not depend on the current working directory. Windows remains portable and project-relative rather than assuming a literal home-directory path.

This repository contains the Cockpit web layer only. ROV propulsion/control remains a separate service and communicates through the configured NATS Core boundary. Data logging and HiL/SiL work are separate repositories.

## Layout

- `src/rov_cockpit/` — Python package, templates, and static assets.
- `configs/` — deployment, camera, media, authentication-template, and reverse-proxy configuration.
- `docs/` — operational and engineering documentation.
- `tests/` — Cockpit tests and test guidance.

Camera and media ownership belongs to Cockpit: camera inventory, Motion configuration, Nginx reverse-proxy configuration, still capture, rolling video retention, gallery, and downloads are maintained here. The original monolithic ROV repository must not contain duplicate camera or Nginx configuration.

The Cockpit `/data/` page reads CSV exports from `CSV_ROOT` (default `<project>/data/csv`), permits selection of CSV sensor fields, displays a bounded preview and provides filtered downloads without modifying the source file. Datalogger storage and export production remain Datalogger responsibilities.

The live Cockpit instrument row includes the existing compass, attitude and depth indicators, plus a separate pitch-only attitude indicator for nose-up/nose-down inclination. It uses the NATS subject `sensor.ahrs.imu.pitch` and displays unavailable or non-numeric values without inventing a measurement. The TypeScript Web Component set includes `<rov-heading>`, `<rov-attitude>`, `<rov-pitch>`, `<rov-camera-pitch>`, `<rov-battery>`, and `<rov-network-status>`; these components consume shared state and contain no NATS or WebSocket transport logic.

The live instrument row also includes a separate camera inclination indicator. It consumes `sensor/camera/main/pitch`, expressed in degrees relative to the ROV body, where `0°` is straight ahead. The camera-control implementation is responsible for converting its physical 90° servo home position into this representation. The topic and physical correspondence require bench validation before the value is treated as measured camera orientation.

The map supports optional Raspberry Pi Nginx tile caching through `MAP_TILE_PROXY=true` for mobile-link deployments. Local Windows development uses direct provider URLs by default.
- `requirements.txt` — runtime dependencies, following the project’s TiaB-style dependency workflow.
- `scripts/` — Windows portable WinPython installation and startup scripts, the project-local POSIX dependency installer, Raspberry Pi provisioning, and the Nginx configuration helper.

## Runtime rules

The main `<rov-attitude>` instrument is currently a native SVG/CSS virtual-horizon preview showing roll (`r:`) and pitch (`p:`) from the shared TypeScript state. The separate pitch and camera-pitch instruments remain on the existing path; Flight Indicator is retained for those remaining legacy instruments.

The dashboard includes a left-side vertical depth/altitude strip using the existing `sensor/water/depth` route and decimetre-to-metre conversion. The former lower-right Flight Indicator altimeter and top-bar Heading/Depth items have been removed; the heading strip and left-side depth/altitude strip are the active overlay presentations. Both strips use a white instrument label and amber current-value presentation. The heading strip remains an independent overlay, positioned below the top bar with fallback spacing and a foreground stacking level.

The Windows frontend helper validates the project-root `package.json`, runs npm from the project root, and propagates npm and TypeScript failures before Uvicorn starts.

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
- The incremental frontend telemetry layer is authored in `frontend/src/`, compiled to `src/rov_cockpit/static/dist/`, and connects only to `/ws/telemetry`. It must not contain NATS clients, NATS URLs, credentials, or direct broker access. Existing inline telemetry routing remains active until instruments are migrated.
- The depth display is the first migrated instrument Web Component: `<rov-depth>` consumes `sensor/water/depth` from the TypeScript state model, while the existing altimeter remains inline until separately migrated. Invalid or unavailable depth is displayed explicitly as `Depth unavailable`.

The ROV profile includes a combined `<rov-hud>` navigation instrument. It presents roll and pitch in a central virtual horizon, depth scales at the sides, and a heading tape below. The HUD consumes shared telemetry state and does not contain transport logic. It is a ROV-specific presentation; other robot profiles may omit it.

The live dashboard provides a translucent, keyboard-dismissible navigation popover for secondary Cockpit routes. The menu is an operator-interface presentation and must not obscure the primary camera/HUD status view or become a control-safety mechanism.

TypeScript is compiled automatically by the frontend build helper before application launch. The helper uses project-local package installation and preserves the committed `static/dist` output when npm is unavailable; it does not modify PATH or machine-wide locations.

General-purpose styling uses Pico.css with Cockpit-specific rules in `src/rov_cockpit/static/css/cockpit.css`; MDB is no longer loaded by the templates. jQuery remains an intentional legacy dependency for Flight Indicator until that library is isolated or replaced. On Linux, `scripts/1_install_dependencies.sh` may install distribution `nodejs` and `npm` packages through `apt-get` and `sudo` when absent; macOS deliberately does not install Node.js and uses existing npm or committed frontend output.

The desktop top bar is constrained to `--rov-nav-height` (`60 px`), uses `--rov-nav-font-size` (`0.75 rem`, approximately 75 % of the normal root size) for explicit text sizing, with non-wrapping navigation and controlled horizontal scrolling for narrower desktop viewports. Heading and network overlays use the same custom-property anchor and `--rov-overlay-gap` (`8 px`) so they do not touch the bar when it is resized.

## Documentation-sync rule

The reusable robot-profile requirements are maintained in `docs/robot-profile-requirements.md`. Cockpit is a generic robot operator UI; the ROV, K9, PiWars, and future robots are represented by validated JSON profiles. One profile is active per robot Raspberry Pi, and Cockpit and Controller must use the same profile identity and configuration hash. Operator input mapping belongs in Cockpit, while physical motor, actuator, safety, and direction mapping belongs in Controller.

Cockpit, Control, and Datalogger are co-installed services on the robot Raspberry Pi and exchange messages through NATS Core. Cockpit provides operator-facing commands and telemetry presentation, Control owns hardware-facing commands and safety, and Datalogger observes and records the agreed NATS subjects without altering control messages.

The shared profile is loaded and validated at boot before these services start. A profile change requires a controlled restart or reboot and is not applied live.

Robot profiles currently live in Cockpit under `configs/profiles/`, which is the source of truth. Control and Datalogger consume the deployed active profile rather than maintaining independently edited profile copies.

The runtime copy on the robot Raspberry Pi is initially `/etc/robot/profile.json`, read by Cockpit, Control, and Datalogger during boot.

Camera sources use an adapter and processing pipeline before Nginx presents the stream to browsers. The pipeline must allow CSI, USB, and ROS 2 virtual cameras, with optional stages such as lens de-warping, without requiring camera-specific Cockpit UI paths.

Windows automatically bootstraps the pinned official Node.js/npm archive into the ignored project-local `node-runtime/` directory when required, using checksum verification and no administrator rights. The build helper may prepend that directory to the child process PATH only while invoking npm; it does not persist or modify the Windows user/system PATH. macOS/Linux use an available npm installation and retain the committed frontend output when npm is unavailable.

Any change to routes, authentication, deployment, configuration, dependencies, media behaviour, or repository boundaries must update the relevant `docs/` file and this `MASTER_CONTEXT.md` in the same change. Every change must include a consistency check of this file; if it is not a true reflection of current behaviour, correct it immediately. Documentation must remain current, use formal British English, and be written for readers with an engineering degree or equivalent technical experience.

Before implementation, inspect this document and the existing implementation. Treat this document as the architectural source of truth, avoid unrelated improvements, preserve working behaviour rather than changing style for its own sake, introduce no unrequested frameworks or dependencies, and prefer the smallest safe change. After implementation, run relevant tests, run the application where practical, check browser-facing behaviour, check imports and static assets, verify the WebSocket telemetry path, update this document if architecture or behaviour changed, and report exact changes and known limitations.

Where SI units are used, place a space between the numerical value and the unit symbol, for example `5 m`, `12 V`, and `20 °C`. Use the degree symbol `°` by preference for angles.

## Windows scripting and deployment standard

The enforceable documentation policy is `docs/documentation-policy.md`, contributor guidance is `CONTRIBUTING.md`, and the maintained current-state record is `docs/status.md`. The standard-library audit `tests/test_documentation.py` and pull-request classifier `tests/documentation_change_policy.py` must pass locally and in CI. Its maintainable path rules and documented exemptions are held in `tests/documentation_change_policy.json`. Status statements must distinguish implemented, automated-test verified, bench-tested, production-validated, and planned or unverified behaviour.

Future Windows batch, PowerShell, and launcher scripts must use a deliberately verbose diagnostic style with formal British English, explicit `[INFO]`, `[PASS]`, `[WARN]`, `[FAIL]`, and `[SKIP]` labels, and an initial project/environment summary. Scripts must derive absolute paths from their own location, resolve tools and DLLs from project-relative paths, avoid modifying PATH, the registry, system directories, or machine-wide locations, and require no administrator rights unless a documented third-party driver or SDK explicitly requires them.

The same rules apply to POSIX shell scripts on macOS, Linux, and Raspberry Pi. Shell scripts must use strict error handling, derive paths from the script location, avoid unapproved system changes, validate prerequisites, check important command exit statuses, preserve diagnostic information after failure, and report the final environment state clearly.

The Raspberry Pi deployment helper `scripts/3_configure_nginx.sh` is the supported repeatable method for installing the Cockpit reverse-proxy configuration. It may require `sudo` because it changes system Nginx and systemd state; it must back up an existing site configuration before replacement, validate Nginx before reload, and report the resulting service and cache state.

The separate `scripts/0_provision_raspberry_pi.sh` is the supported initial Debian-based Raspberry Pi provisioning path. It installs the required Python, Node.js/npm, Nginx, Motion, and NATS packages, creates the Cockpit virtual environment, installs the selected shared robot profile, invokes the sibling Control networking deployment when available, installs the Cockpit systemd unit, and enables/checks the services. If a required package is unavailable from configured trusted Debian repositories, it must stop and report the condition rather than use an unverified installer. `scripts/1_install_dependencies.sh` remains project-local and must not install system packages or services.

Provisioning also installs the selected shared robot profile at `/etc/robot/profile.json` and invokes the sibling Control repository's networking deployment when available. Control remains the owner of NetworkManager, hostname, SMB, Avahi, and fallback-network configuration; Cockpit only orchestrates these steps during initial provisioning.

Scripts must reject unsupported direct UNC execution where local paths are required, validate prerequisites before dependent operations, check important external-command exit statuses, fail early with the path, consequence, and corrective action, be safe to rerun where practical, and avoid deleting or overwriting user data. Temporary files must be project-local and cleaned after success or preserved with a diagnostic path after failure. Downloads must be verified using an explicit checksum or trusted manifest where available. Vendor DLLs, SDKs, and installers remain optional or unverified until their presence and operation are confirmed, and native DLL architecture must match the active Python architecture. Output must distinguish installed, detected, available, configured, connected, bench tested, and physically validated states, and finish with an environment summary showing every check.
