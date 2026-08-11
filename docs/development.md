# Development setup

## Prerequisites

- Python 3.11 or newer.
- `uv` for macOS/Linux dependency and environment management.
- PowerShell and internet access for the Windows WinPython bootstrap.
- A local Mosquitto broker for MQTT-backed runs.
- Linux/Raspberry Pi hardware for GPIO, serial, I2C, SPI, and PWM behavior.
- A Bluetooth or USB HID gamepad is optional for controller testing.

## Windows setup

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
- `/json/` — dashboard-oriented MQTT snapshot.
- `/docs` — FastAPI-generated API documentation.

### Additional Cockpit interfaces

The Cockpit also exposes `/login`, `/logout`, `/account/`, `/ws/telemetry`, and `/api/session`. `/docs` is the FastAPI-generated API documentation route. Anonymous viewers can use the dashboard; driver/admin authentication is required for the account page.

## Control service

```bash
cd Control
../.venv/bin/python main.py
```

This process expects the target hardware and local MQTT broker. Do not run it against connected propulsion hardware without first following the staged test procedure.

## Configuration

The Cockpit MQTT connection uses `MQTT_HOST` and `MQTT_PORT`, defaulting to `localhost:1883`. The broker WebSocket port used by the browser is configured separately in `Configs/mosquitto.conf` and the templates.

## Camera media

Motion is configured for 30-minute rolling MP4 recordings by default under its target directory. The Cockpit `/files/` page can change the segment length in minutes, lists recordings, provides download links, and can capture the current high-resolution Motion frame as a still image. Restart Motion after changing the setting. Set `MEDIA_ROOT` and `MEDIA_MIN_FREE_GB` when deploying the Cockpit; the media maintenance path removes the oldest recordings when the free-space floor is reached.

## Gamepad development

The Browser Gamepad API works with standard HID controllers on Windows and macOS in current Edge, Chrome, and Firefox releases; Safari is supported on macOS. Pair the controller in the operating system before opening `/gamepad/`. Firefox may require a button press before it reports the controller.

Use `localhost` or `127.0.0.1` for local development. A deployed Cockpit should use HTTPS. Settings on `/gamepad/` are stored in the browser and can be adjusted without changing Python code. Test with propulsion disabled until the control mapping, arm button, dead-man button, neutral-on-disconnect behavior, and timeout handling have been verified.
