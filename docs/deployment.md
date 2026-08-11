# Raspberry Pi deployment

The checked-in deployment assumes the repository is installed at `/home/pi/ROV`.

## One-time installation

From the repository root on the target machine:

```bash
chmod +x scripts/*.sh
./scripts/1_install_dependencies.sh
```

On Windows use `scripts\\1_install_dependencies.bat`; it automatically downloads a project-local 64-bit WinPython runtime when needed and installs the shared `requirements.txt` with that runtime's `pip`. This includes Uvicorn and does not require `uv`. On macOS use the shell script without `sudo`; it automatically installs `uv`, creates `.venv`, and installs the same `requirements.txt`. On Linux/Raspberry Pi it also installs the optional broker, Nginx, Motion, and Python build packages and prints the required `dialout` guidance.

The Windows bootstrap is designed for machines where users do not have administrator rights: it installs below the project directory, rejects UNC paths for predictable process/filesystem behavior, and uses portable Python plus `pip` rather than requiring system Python or `uv`. It still needs write access to the project directory and network access for first-time downloads.

## Start the application

```bash
./scripts/2_start_app.sh
```

On Windows use `scripts\\2_start_app.bat`. On macOS, or on Linux without deployed systemd units, the shell script starts a local Uvicorn Cockpit server and opens the browser. On a deployed Raspberry Pi it restarts Mosquitto, Motion, the Python control service, Cockpit, and Nginx; use that mode only when it is safe to interrupt the ROV.

## Services

| Service | Unit/config | Role |
|---|---|---|
| Mosquitto | `Configs/mosquitto.conf` | MQTT TCP and WebSocket broker |
| Nginx | `Configs/nginx.conf` | HTTP reverse proxy and static files |
| Motion | `Configs/motion*.conf` | Camera streams |
| Python | `Configs/python.service` | Hardware control loop |
| Cockpit | `Configs/cockpit.service` | FastAPI/Uvicorn web application |

Camera inventory is stored in `Configs/cameras.json`. The Cockpit `/cameras/` page edits this inventory. Motion still uses its generated/deployed `.conf` files, so restart Motion after applying a matching configuration change.

Cockpit media is stored below `MEDIA_ROOT` (default: `<project>/media`), with `stills/` and `videos/` subdirectories. On the Raspberry Pi, Motion writes recordings to `/home/pi/ROV/media/videos`. `MEDIA_MIN_FREE_GB` defaults to 2 GB; the oldest recordings are removed when the free-space floor is reached. The default recording segment length is 30 minutes and is stored in `Configs/media.json`.

The Cockpit `/files/` page captures stills from the current Motion frame, displays the still gallery, lists recordings, and provides downloads. View-only access is anonymous. Driver/admin login and password management exist, but enforcement of control and every administrative route remains incomplete.

## Install/update

From the repository's `Configs` directory on the Pi:

```bash
sudo bash setup.sh
```

The script copies configuration files into system locations, reloads systemd, and enables/restarts the Python and Cockpit services. Review the script before running it on a new image because it assumes existing packages, users, paths, and permissions.

## First checks

```bash
systemctl status mosquitto nginx python cockpit
curl http://127.0.0.1/
curl http://127.0.0.1:8080/json/
mosquitto_sub -h 127.0.0.1 -t '#' -v
```

The MQTT configuration currently permits anonymous access. Restrict this before exposing the broker beyond the trusted ROV network.
