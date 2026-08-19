# ROV Cockpit

FastAPI/Uvicorn operator web application for the ROV.

## Run locally

From this directory:

```bash
PYTHONPATH=src ../.venv/bin/python -m uvicorn rov_cockpit.app:app --host 127.0.0.1 --port 8080
```

The Windows launcher uses `runtime\python.exe` instead. The application defaults to port `8080` and serves the dashboard at `/`.

## Important routes

- `/` — live dashboard, combined HUD heading tape, gauges, telemetry, and camera fallback.
- `/files/` — still gallery, rolling recordings, capture buttons, and downloads.
- `/cameras/` — camera inventory configuration.
- `/gamepad/` — Browser Gamepad API detection and mapping settings.
- `/account/` — authenticated password management.
- `/login` and `/logout` — driver/admin session routes.
- `/ws/telemetry` — browser telemetry WebSocket.
- `/api/system/time-sync` — authenticated browser-to-Control UTC clock relay.
- `/json/` — dashboard-oriented NATS snapshot.
- `/docs` — FastAPI-generated API documentation.

## Architecture

Cockpit subscribes to NATS Core server-side and forwards telemetry to browsers over `/ws/telemetry`. Browsers do not connect directly to NATS. NATS subjects use dot separators; Cockpit presents them to the existing dashboard as slash-separated topic keys. An authenticated driver/admin browser can also relay its UTC time on page load and every 60 seconds through the active profile's time-synchronisation subject. Control validates and, where permitted, applies the system-clock change; Cockpit and the browser cannot alter the host clock directly. The application must not become the only safety layer for propulsion; motor neutral, timeout, and emergency-stop behaviour belong in the control path as well.

## Authentication status

Anonymous view-only access is available. `driver` and `admin` accounts are stored in `configs/users.json` using PBKDF2 hashes. Copy `configs/users.example.json` before first use. The initial implementation provides login/logout and password management; enforcement of control and all administrative routes remains on the roadmap.
