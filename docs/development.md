# Development setup

## Prerequisites

- Python 3.11 or newer.
- `uv` for macOS/Linux dependency and environment management.
- PowerShell and internet access for the Windows WinPython bootstrap.
- A reachable NATS Core server for telemetry-backed runs.
- Linux/Raspberry Pi hardware for GPIO, serial, I2C, SPI, and PWM behavior.
- A Bluetooth or USB HID gamepad is optional for controller testing.

## Windows setup

The Windows frontend helper validates the project-root `package.json`, changes to the project root for npm operations, and propagates npm/TypeScript failures. A successful launcher message therefore indicates that the frontend build command actually completed successfully.

Windows development deliberately follows the Test-in-a-Box portable-runtime pattern. Run:

```bat
scripts\1_install_dependencies.bat
scripts\2_start_app.bat
```

The installer downloads 64-bit WinPython into `runtime\` when required, verifies its SHA-256 checksum, and installs the shared `requirements.txt` with that runtime's `pip`. It does not use `uv`. The scripts reject UNC paths; copy the repository to a local drive or map the share to a drive letter first.

### Windows design decisions

- **UNC paths are rejected** because portable Python, package installation, subprocess working directories, and browser launchers can behave inconsistently when the project is run from `\\server\share\...`. A local drive or mapped drive gives the bootstrap stable filesystem semantics.
- **Portable Python is used** so the project does not depend on a pre-existing system Python installation, registry configuration, administrator-managed PATH entries, or a particular Python version. The runtime is kept in the project and reused on later runs.
- **`uv` is intentionally not used on Windows**. The Test-in-a-Box Windows pattern uses portable Python plus `pip`, which removes an extra bootstrap dependency and keeps installation self-contained. `uv` remains useful on macOS/Linux, where the shell workflow already expects it.
- **No administrator rights are required** for the Windows bootstrap. WinPython, packages, and project environments are installed below the project directory. The user only needs write access to the project folder and normal outbound access to the download/package hosts.
- **Checksum verification is required** before the portable runtime is extracted, so a partial or altered download is not silently used.

## macOS and Linux setup

The shell scripts use `uv` to create `.venv` and install the shared `requirements.txt`:

```bash
./scripts/1_install_dependencies.sh
./scripts/2_start_app.sh
```

## Cockpit

```bash
cd Cockpit
../.venv/bin/python app.py
```

The application listens on `0.0.0.0:8080` by default. Use `APP_HOST`, `APP_PORT`, and `APP_RELOAD=true` to override local behavior. The production-style command is:

```bash
../.venv/bin/python -m uvicorn app:app --host 0.0.0.0 --port 8080
```

### Cockpit access modes

The Cockpit provides anonymous view-only access. Driver and administrator actions require login:

- `viewer` is the anonymous default and can view telemetry, video, media, and downloads.
- `driver` is authenticated and is intended for gamepad and vehicle-control functions.
- `admin` is authenticated and is intended for configuration, Motion, media, and system administration.

The Login link changes to the signed-in username with a Font Awesome logout icon. Drivers can change their own password at `/account/`; administrators can change their own and other configured accounts. User accounts are stored in `Configs/users.json` as PBKDF2 password hashes. Set a strong `COCKPIT_AUTH_SECRET` before using authentication beyond local development.

Useful routes:

- `/` — main dashboard.
- `/map/` — map view.
- `/3d/` — 3D view.
- `/files/` — placeholder files page.
- `/json/` — dashboard-oriented NATS snapshot.
- `/docs` — FastAPI-generated API documentation.

### Additional Cockpit interfaces

The Cockpit also exposes `/login`, `/logout`, `/account/`, `/ws/telemetry`, and `/api/session`. `/docs` is the FastAPI-generated API documentation route. Anonymous viewers can use the dashboard; driver/admin authentication is required for the account page.

## Control service

```bash
cd Control
../.venv/bin/python main.py
```

This process expects the target hardware and a reachable NATS Core server. Do not run it against connected propulsion hardware without first following the staged test procedure.

## Configuration

The Cockpit NATS connection uses `NATS_URL` and `NATS_SUBJECT`, defaulting to `nats://127.0.0.1:4222` and `>`. Browsers receive telemetry through the Cockpit WebSocket and do not connect directly to NATS.

The TypeScript telemetry layer is authored under `frontend/src/` and emits browser state from `/ws/telemetry` into `window.rovCockpitTelemetry`. Vue 3 is now an approved frontend dependency. The migration is incremental: the battery status instrument is now rendered by Vue from `frontend/src/vue/status-instruments.ts`; the existing `<rov-hud>` remains the compatibility renderer until the HUD is ported. The browser module import map resolves Vue to the committed `static/dist/vendor/vue.runtime.esm-browser.prod.js` asset so the no-bundler TypeScript build can run on the robot. Depth, network status, style editing, and simulator surfaces remain staged for migration. NATS logic remains exclusively in FastAPI.

The launcher calls `scripts/build_frontend.bat` on Windows or `scripts/build_frontend.sh` on macOS/Linux before starting the application. These scripts compile TypeScript into `src/rov_cockpit/static/dist/` when npm is available. If npm is unavailable, they report a warning and retain the existing compiled output so the Cockpit can still start.

The depth top-bar display is now implemented as `<rov-depth>`. It consumes the typed `sensor/water/depth` state without opening a WebSocket or knowing about NATS.

The live ROV page does not render the former standalone heading band or depth meter. These values are owned by the combined `<rov-hud>` instrument.

The HUD is a transparent video overlay. Its reference presentation uses open central attitude arcs, roll scales on both sides, a right-side depth scale, and a graduated heading tape along the bottom. The heading tape follows the upstream CompassHUD approach: 3-degree marks are projected relative to the current heading, only the visible +/-90-degree region is shown, and cardinal/major labels are retained. The video remains visible through the instrument; the HUD must not use a filled dark panel as its primary background.

## HUD style editor

The main Cockpit page includes a reusable `rov-instrument-style-editor` for the ROV HUD. It provides live controls for text colour, line colour, accent colour, and line thickness. Values currently persist in browser local storage under a profile- and component-specific key; robot-backed profile persistence is planned.

## Development sensor simulator

The `/simulator/` page is always available from the main navigation. Its runtime switch is off by default unless `COCKPIT_ENABLE_SIMULATOR=true` is set. When enabled, slider changes automatically send depth, heading, pitch, roll, battery voltage, and battery percentage values into the Cockpit browser telemetry path; no send button is required. Simulation injection broadcasts each submitted topic directly to connected WebSocket clients before the request completes, so the HUD and status instruments update together. The simulator does not publish to NATS or Control and must not be enabled during live physical robot operation.
Secondary pages use neutral `--` status placeholders in the shared header; live telemetry presentation belongs to the Live Cockpit page and the combined ROV HUD.
The shared header intentionally does not display temperature, heading, depth, or uptime. Battery percentage and voltage are shared Vue instruments and work on every page; heading and depth belong in the combined live HUD; temperature and uptime remain available through the telemetry/data views.

## Camera media

Motion is configured for 30-minute rolling MP4 recordings by default under its target directory. The Cockpit `/files/` page can change the segment length in minutes, lists recordings, provides download links, and can capture the current high-resolution Motion frame as a still image. Restart Motion after changing the setting. Set `MEDIA_ROOT` and `MEDIA_MIN_FREE_GB` when deploying the Cockpit; the media maintenance path removes the oldest recordings when the free-space floor is reached.

## Gamepad development

The Windows frontend build automatically bootstraps the pinned official Node.js/npm archive into the project-local `node-runtime/` directory when required. It verifies the archive against `SHASUMS256.txt`, requires no administrator rights, does not modify PATH, and rejects direct UNC execution. Linux `scripts/1_install_dependencies.sh` installs distribution `nodejs` and `npm` packages through `apt-get` and `sudo` when absent. macOS deliberately does not install Node.js; it uses available npm, while the committed compiled output remains the fallback when npm is unavailable.

General-purpose page styling now uses the readable Pico CSS file from the frontend dependency `@picocss/pico`. It is served as `src/rov_cockpit/static/css/pico.css`; Cockpit-specific variables and compatibility classes are maintained in `src/rov_cockpit/static/css/cockpit.css`. The frontend build refreshes this file from the package when npm is available.

The Browser Gamepad API works with standard HID controllers on Windows and macOS in current Edge, Chrome, and Firefox releases; Safari is supported on macOS. Pair the controller in the operating system before opening `/gamepad/`. Firefox may require a button press before it reports the controller.

Use `localhost` or `127.0.0.1` for local development. A deployed Cockpit should use HTTPS. Settings on `/gamepad/` are stored in the browser and can be adjusted without changing Python code. Test with propulsion disabled until the control mapping, arm button, dead-man button, neutral-on-disconnect behavior, and timeout handling have been verified.
Vue status instruments require `window.rovCockpitTelemetry` to be assigned before their mount lifecycle runs; the frontend bootstrap preserves that ordering so migrated instruments receive the initial telemetry snapshot.
Battery state-of-charge telemetry shall be numeric percent in the inclusive `0–100` range. The shared header mounts the Vue battery instrument; the old inline battery renderer is removed so it cannot reintroduce the legacy `0–10` conversion. The Vue instrument still accepts legacy `0–10` values temporarily for compatibility, but the simulator and all new publishers shall use `0–100`.
All HTML pages extend `templates/base.jinja`. The base template owns the document shell, shared styles, Vue import map, cache-busted frontend bootstrap, and `header.jinja` navigation; page templates provide only their content and page-specific scripts. This ensures shared Vue instruments such as battery status and voltage mount on every page and prevents navigation/layout divergence.
