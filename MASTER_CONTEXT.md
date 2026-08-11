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
- `requirements.txt` — runtime dependencies, following the project’s TiaB-style dependency workflow.
- `scripts/` — Windows portable WinPython installation and startup scripts.

## Runtime rules

- Run with FastAPI/Uvicorn on port `8080`.
- Use `PYTHONPATH=src` and the package entry point `rov_cockpit.app:app`.
- Browser clients receive telemetry through the Cockpit WebSocket; they do not connect directly to NATS.
- Cockpit uses NATS Core at `NATS_URL` (default `nats://127.0.0.1:4222`) and subscribes to `NATS_SUBJECT` (default `>`). NATS subjects use dots; dashboard keys retain slash notation through the transport adapter.
- Anonymous users remain view-only. Driver/admin access is authenticated.
- Do not make the Cockpit the only propulsion safety layer; neutral, timeout, and emergency-stop behaviour belongs in the control service.
- Keep paths repository-relative through `PROJECT_ROOT`; do not reintroduce assumptions about the original monolithic ROV folder.
- On Windows, use `scripts/1_install_dependencies.bat` followed by `scripts/2_start_app.bat`. These require a local or mapped drive, install portable Python without administrator rights, and do not use `uv`.

## Documentation-sync rule

Any change to routes, authentication, deployment, configuration, dependencies, media behaviour, or repository boundaries must update the relevant `docs/` file and this `MASTER_CONTEXT.md` in the same change.
