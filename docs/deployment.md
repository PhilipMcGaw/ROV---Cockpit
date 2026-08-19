# Raspberry Pi deployment

## Supported target

The supported target for the complete robot installation is Raspberry Pi OS (the current name for Raspbian) based on Debian Bookworm, 64-bit `arm64`, on a Raspberry Pi 4 or 5 with at least 4 GB RAM. This is the recommended baseline for NATS Core, Nginx, Motion, NetworkManager, Samba, Avahi, and the three robot services.

The provisioning script requires a Debian-based Linux system with `apt-get`; it does not currently verify the Raspberry Pi model, OS release, or CPU architecture. Raspberry Pi 3, Zero 2 W, older boards, Raspberry Pi OS Bullseye, and 32-bit `armhf` installations are not production-validated. They may run the Python application, but package availability, camera support, NATS installation, memory, and performance must be checked on the actual image before use.

The complete installation is not supported on non-Debian distributions, 32-bit-only operating systems, or non-Raspberry-Pi ARM boards unless the required packages and hardware interfaces are separately verified. Development-only Cockpit testing remains supported on macOS, Windows, and general Linux without Raspberry Pi hardware.

Before provisioning, record the target details:

```zsh
uname -m
cat /etc/os-release
getconf LONG_BIT
```

Expected baseline: `aarch64`, Raspberry Pi OS Bookworm, and `64`.

On Linux, the documented default development location is `~/robots/ROV---Cockpit`, beside the other ROV repositories. On macOS, use a user-selected workspace beneath the home directory, for example `~/Projects/ROV/ROV---Cockpit`. Raspberry Pi provisioning renders the installed systemd and Nginx files using the actual repository locations and runtime account; no `/home/pi` checkout path is required.

## One-time installation

### Clone the sibling repositories

The robot uses separate repositories for separate responsibilities, but they are installed side-by-side on the same Raspberry Pi. Clone the three runtime repositories into one common parent directory:

```zsh
mkdir -p ~/robots
cd ~/robots
git clone <cockpit-repository-url> ROV---Cockpit
git clone <control-repository-url> ROV---Control
git clone <datalogger-repository-url> ROV---Datalogger
```

The final layout is:

```text
~/robots/
├── ROV---Cockpit/
├── ROV---Control/
└── ROV---Datalogger/
```

HiL/SiL normally remains on the development workstation or VM rather than on the robot:

```text
~/robots/ROV---HiL-and-SiL/
```

The Cockpit provisioning script can find Control and Datalogger automatically when they are beside Cockpit. Use `CONTROL_ROOT` or `DATALOGGER_ROOT` if either repository is stored elsewhere. The provisioning path installs all three virtual environments, renders the Control, Cockpit, and Datalogger systemd units for the invoking runtime account and actual checkout locations, configures shared media/CSV directories, and invokes Control's networking deployment.

Before provisioning, create the ignored Control deployment files and replace every placeholder credential:

```zsh
cd ~/robots/ROV---Control
cp configs/network.env.example configs/network.env
cp configs/network.secrets.example configs/network.secrets.env
cp configs/nats.env.example configs/nats.env
chmod 600 configs/network.secrets.env
```

`network.secrets.env` contains Wi-Fi, hotspot, SMB, and NATS credentials. It MUST have mode `600` or `400` before provisioning. `nats.env` controls whether NATS listens only on loopback (the default) or is accessible to an explicitly trusted HiL/SiL network. Neither file is committed.

From the repository root on the target machine:

```bash
chmod +x scripts/*.sh
sudo bash scripts/0_provision_raspberry_pi.sh
```

The provisioning script is the initial Raspberry Pi setup path. It installs Python, Node.js/npm, Nginx, Motion, curl, certificates, NATS Server, NetworkManager, its `dnsmasq` shared-network dependency, Avahi, and Samba from the configured Debian repositories; creates the Cockpit, Control, and Datalogger virtual environments; creates the shared `stills/`, `videos/`, and `data/csv/` directories; installs the shared robot profile at `/etc/robot/profile.json`; renders the Control, Cockpit, Datalogger, Motion, and Nginx configuration for the actual checkout paths; enables the services; and invokes Control's network deployment. NATS uses the credentials from the ignored secrets file and binds to `127.0.0.1` unless `NATS_REMOTE_ACCESS=true` is configured. It requires `sudo` because it changes system packages and services. It does not physically validate cameras, sensors, motor controllers, network failover, or the ROV data link.

The installed Control systemd unit grants only `CAP_SYS_TIME` for the profile-driven browser-time synchronisation feature. This allows Control, rather than Cockpit or the browser, to correct the RPi system clock. After deploying a changed Control unit, run `sudo systemctl daemon-reload` and restart Control when the robot is safe. A logged-in driver/admin Cockpit browser then provides UTC time immediately and every 60 seconds. This is not a replacement for NTP where a trusted network time service is available.

The development sensor simulator is available at `/simulator/` but starts in a safe, disabled state. Set `COCKPIT_ENABLE_SIMULATOR=true` only for development or HiL/SiL deployments, never for a live robot. It injects values into Cockpit browser telemetry and does not replace NATS, Control, or physical sensor validation.

Set `ROBOT_PROFILE` when provisioning a non-ROV robot, for example `ROBOT_PROFILE=k9 sudo bash scripts/0_provision_raspberry_pi.sh`. Set `CONTROL_ROOT` or `DATALOGGER_ROOT` when either sibling repository is not located beside Cockpit. The Control network and NATS configuration files must already exist, and the secrets file must use mode `600`, before provisioning starts.

If NATS Server is unavailable from the configured Debian repositories, provisioning stops before service configuration. Add a trusted, documented repository or use the approved NATS deployment procedure; do not substitute an unverified installer.

The dependency script is deliberately separate and project-local. It creates or updates only the Python environment and installs `requirements.txt`; it does not install Nginx, Motion, NATS or any system service. Use it for normal dependency updates after provisioning.

Windows scripts are intentionally verbose and portable. They derive paths from the script location, reject direct UNC execution, do not modify PATH or the registry, use the project-local WinPython runtime, require no administrator rights, verify the WinPython download, and report prerequisite and command failures explicitly.

On Windows use `scripts\\1_install_dependencies.bat`; it automatically downloads a project-local 64-bit WinPython runtime when needed and installs the shared `requirements.txt` with that runtime's `pip`. This includes Uvicorn and does not require `uv`. On macOS use the shell script without `sudo`; it creates `.venv` and installs the same `requirements.txt`. On Linux/Raspberry Pi, use `scripts/0_provision_raspberry_pi.sh` for initial platform provisioning, then `scripts/1_install_dependencies.sh` for project-local dependency updates.

The Windows bootstrap is designed for machines where users do not have administrator rights: it installs below the project directory, rejects UNC paths for predictable process/filesystem behavior, and uses portable Python plus `pip` rather than requiring system Python or `uv`. It still needs write access to the project directory and network access for first-time downloads.

## Start the application

```bash
./scripts/2_start_app.sh
```

On Windows use `scripts\\2_start_app.bat`. On macOS, or on Linux without deployed systemd units, the shell script starts a local Uvicorn Cockpit server. On a deployed Raspberry Pi it rebuilds the frontend and restarts Motion, Cockpit, and Nginx; use that mode only when it is safe to interrupt the ROV. Use `systemctl restart python` or `systemctl restart datalogger` separately when those services need a safe restart.

## Services

| Service | Unit/config | Role |
|---|---|---|
| Nginx | rendered from `configs/nginx.conf` | HTTP reverse proxy, static files, and camera stream proxy |
| NATS Core | `/etc/nats/rov-nats.conf` | Authenticated inter-service messaging; optional trusted-network listener |
| Datalogger | rendered from `configs/datalogger.service` | Change-only NATS telemetry logging and CSV export |
| Motion | rendered from `configs/motion*.conf` | Camera streams |
| Cockpit | rendered from `configs/cockpit.service` | FastAPI/Uvicorn web application |

Camera inventory is stored in `configs/cameras.json`. The Cockpit `/cameras/` page edits this inventory. Motion configuration is stored in `configs/motion*.conf`; restart Motion after applying a matching configuration change.

Cockpit media is stored below `MEDIA_ROOT` (default: `<project>/media`), with `stills/`, `videos/`, and `data/csv/` subdirectories. The provisioner creates these directories and renders Motion's recording path to `<Cockpit checkout>/media/videos`. `MEDIA_MIN_FREE_GB` defaults to 2 GB; the oldest recordings are removed when the free-space floor is reached. The default recording segment length is 30 minutes and is stored in `configs/media.json`.

The Cockpit `/files/` page captures stills from the current Motion frame, displays the still gallery, lists recordings, and provides downloads. View-only access is anonymous. Driver/admin login and password management exist, but enforcement of control and every administrative route remains incomplete.

## Sensor CSV data

The Cockpit `/data/` page displays CSV exports stored below `CSV_ROOT` (default: `<Cockpit project>/data/csv`). It discovers the CSV headers as selectable sensor fields, displays a bounded preview of up to 250 rows, and downloads a new CSV containing all rows for the selected fields. The original CSV is never modified. The standard robot deployment renders `CSV_ROOT` to `<Cockpit checkout>/media/data/csv`, where Datalogger writes `telemetry.csv` and the SMB `media` share exposes the same directory. This page reads CSV exports; it does not itself create the Datalogger records.

## Configure Nginx as the Raspberry Pi reverse proxy

Install Nginx on the Raspberry Pi:

```bash
sudo apt update
sudo apt install -y nginx
```

The repeatable configuration helper renders the checkout path before it validates and installs the site:

```bash
sudo bash scripts/3_configure_nginx.sh
```

Run it from the Cockpit repository or provide the script’s absolute path. It creates the Nginx map-cache directory, renders the actual Cockpit checkout path, backs up an existing Cockpit site configuration before replacement, validates Nginx, enables the site, reloads Nginx, and restarts Cockpit. It requires `sudo` because Nginx and systemd are system services; it does not alter shell PATH, the registry, or unrelated user data.

The operator interface is then available at the Raspberry Pi address on HTTP port `80`. Nginx owns browser caching for `/static/`; the Python application does not need to emit no-cache headers for static assets.

The live page presents roll, pitch, depth, and heading together through the combined `<rov-hud>` instrument. The page also loads the committed Vue runtime vendor asset through its import map for migrated visual components. It does not substitute default values when telemetry is unavailable or invalid.

The live page shows camera inclination in the bottom command dock. It listens to `sensor/camera/main/pitch`, expressed in degrees relative to the ROV body, where `0°` is straight ahead. The camera-control implementation must convert its physical 90° servo home position to this representation. The same dock also displays the primary-light level from `output/lights/left` as a numeric `0–100 %` value and water temperature from `sensor/water/temperature` in `°C`. Until these topics are supplied by the control system and bench tested, the indicators remain unvalidated.

### Mobile-link map tile caching

For deployments using a mobile data link, set `MAP_TILE_PROXY=true` in the Cockpit environment. The map then requests `/map-tiles/...` from Nginx, which caches tiles locally under `/var/cache/nginx/rov-map` and requests upstream tiles only on a cache miss or revalidation. The cache is limited to 256 MB and unused entries expire after 7 days. This is a demand-driven cache; do not pre-fetch or bulk-download map areas. Keep the OpenStreetMap and OpenSeaMap attribution visible.

To roll back, restore the previous site file, run `sudo nginx -t`, and restart Nginx. Do not expose Uvicorn directly to the LAN when Nginx is intended to be the reverse proxy.

## First checks

```bash
systemctl status nats-server nginx motion python cockpit datalogger
curl http://127.0.0.1/
curl http://127.0.0.1:8080/json/
nmcli device status
```

For NATS diagnostics, use an authenticated client URL from the restricted `/etc/robot/nats.env` file; do not expose that file or credentials in shell history. Confirm the configured authorisation model before enabling `NATS_REMOTE_ACCESS`.
