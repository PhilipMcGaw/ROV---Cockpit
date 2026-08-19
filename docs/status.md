# Cockpit current status

## Architecture

The application layer is FastAPI served by Uvicorn. NATS is accessed only by the server; the browser receives telemetry through `/ws/telemetry`. The TypeScript telemetry layer is under `frontend/src` and its browser output is under `src/rov_cockpit/static/dist`. The ROV navigation display is the combined `<rov-hud>` Web Component; shared status instruments remain separate components.

## Implemented behaviour

- FastAPI startup with optional server-side NATS connectivity and read-only operation when NATS is unavailable.
- Browser telemetry through the FastAPI WebSocket endpoint.
- TypeScript state, topic mapping, parsing, and reconnecting WebSocket adapter.
- Independent `<rov-depth>` Web Component consuming shared cockpit state.
- Independent `<rov-battery>`, `<rov-network-status>`, and `<rov-depth>` Web Components consuming shared cockpit state.
- ROV combined `<rov-hud>` instrument presenting roll, pitch, depth, and heading in one navigation overlay. This is the intended navigation instrument for the ROV cockpit.
- Reusable HUD style editor with live colour and line-thickness controls; settings currently persist in browser local storage.
- Development sensor simulator page with runtime enable/disable control and slider-driven browser telemetry injection.
- Existing instruments, camera handling, media capture/download, CSV access, authentication, and Gamepad API support remain part of the application.

## Automated-test verification

The standard-library documentation audit is implemented in `tests/test_documentation.py`. Python source compilation and the documentation audit can run without application dependencies. The TypeScript source and generated browser artefacts are checked during development; a complete browser build requires the frontend toolchain.

## Bench-tested and Production-validated status

The current repository state is not recorded as bench-tested or production-validated against a physical ROV. Camera devices, sensors, propulsion hardware, the production NATS link, and reverse-proxy deployment require separate evidence before those statuses may be claimed.

## Planned or unverified

- Profile-driven selection of instrument modules beyond the current ROV HUD and shared status instruments.
- Robot-backed persistence for instrument visual settings.
- CSS Grid, Pico.css, and complete TypeScript frontend migration.
- Reproducible TypeScript generation in every supported development environment.
- Complete production authentication and authorisation hardening.

## Important references

- `MASTER_CONTEXT.md`
- `docs/documentation-policy.md`
- `docs/development.md`
- `docs/deployment.md`
- `docs/testing.md`
- `tests/documentation_change_policy.py`
- `tests/documentation_change_policy.json`
- `frontend/src/transport/telemetry-websocket.ts`
- `frontend/src/telemetry/store.ts`
- `frontend/src/components/instruments/rov-depth.ts`
- `src/rov_cockpit/static/dist/main.js`
- `src/rov_cockpit/static/dist/components/rov-depth.js`
- `configs/nats.env.example`
- `scripts/1_install_dependencies.bat`
- `scripts/2_start_app.bat`
