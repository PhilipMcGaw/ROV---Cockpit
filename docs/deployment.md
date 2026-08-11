# Raspberry Pi deployment

The Cockpit deployment assumes the repository is installed as `/home/pi/ROV - Cockpit` beside the other ROV repositories.

## One-time installation

From the repository root on the target machine:

```bash
chmod +x scripts/*.sh
./scripts/1_install_dependencies.sh
```

The Cockpit Linux launcher installs its Python environment locally and, on Raspberry Pi/Linux, installs Nginx and Motion. NATS Core is a separate system service and must be available at the configured `NATS_URL`.

Windows scripts are intentionally verbose and portable. They derive paths from the script location, reject direct UNC execution, do not modify PATH or the registry, use the project-local WinPython runtime, require no administrator rights, verify the WinPython download, and report prerequisite and command failures explicitly.

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
| Nginx | `configs/nginx.conf` | HTTP reverse proxy, static files, and camera stream proxy |
| NATS Core | external ROV deployment | Inter-service messaging |
| Motion | `configs/motion*.conf` | Camera streams |
| Cockpit | `configs/cockpit.service` | FastAPI/Uvicorn web application |

Camera inventory is stored in `configs/cameras.json`. The Cockpit `/cameras/` page edits this inventory. Motion configuration is stored in `configs/motion*.conf`; restart Motion after applying a matching configuration change.

Cockpit media is stored below `MEDIA_ROOT` (default: `<project>/media`), with `stills/` and `videos/` subdirectories. On the Raspberry Pi, Motion writes recordings to `/home/pi/ROV/media/videos`. `MEDIA_MIN_FREE_GB` defaults to 2 GB; the oldest recordings are removed when the free-space floor is reached. The default recording segment length is 30 minutes and is stored in `Configs/media.json`.

The Cockpit `/files/` page captures stills from the current Motion frame, displays the still gallery, lists recordings, and provides downloads. View-only access is anonymous. Driver/admin login and password management exist, but enforcement of control and every administrative route remains incomplete.

## Configure Nginx as the Raspberry Pi reverse proxy

Install Nginx on the Raspberry Pi:

```bash
sudo apt update
sudo apt install -y nginx
```

From the Cockpit repository, validate the configuration before enabling it:

```bash
sudo nginx -t -c "$PWD/configs/nginx.conf"
```

Install the Cockpit configuration as the default site. The configuration assumes the Cockpit repository is at `/home/pi/ROV - Cockpit`, Uvicorn listens on `127.0.0.1:8080`, and Motion provides camera streams on ports `8001` and `8002`:

```bash
sudo cp configs/nginx.conf /etc/nginx/sites-available/rov-cockpit
sudo ln -sfn /etc/nginx/sites-available/rov-cockpit /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx
```

The repeatable configuration helper is:

```bash
sudo bash scripts/3_configure_nginx.sh
```

Run it from the Cockpit repository or provide the script’s absolute path. It creates the Nginx map-cache directory, backs up an existing Cockpit site configuration before replacement, validates Nginx, enables the site, reloads Nginx, and restarts Cockpit. It requires `sudo` because Nginx and systemd are system services; it does not alter shell PATH, the registry, or unrelated user data.

The operator interface is then available at the Raspberry Pi address on HTTP port `80`. Nginx owns browser caching for `/static/`; the Python application does not need to emit no-cache headers for static assets.

### Mobile-link map tile caching

For deployments using a mobile data link, set `MAP_TILE_PROXY=true` in the Cockpit environment. The map then requests `/map-tiles/...` from Nginx, which caches tiles locally under `/var/cache/nginx/rov-map` and requests upstream tiles only on a cache miss or revalidation. The cache is limited to 256 MB and unused entries expire after 7 days. This is a demand-driven cache; do not pre-fetch or bulk-download map areas. Keep the OpenStreetMap and OpenSeaMap attribution visible.

To roll back, restore the previous site file, run `sudo nginx -t`, and restart Nginx. Do not expose Uvicorn directly to the LAN when Nginx is intended to be the reverse proxy.

## Install/update

From the repository's `Configs` directory on the Pi:

```bash
sudo bash setup.sh
```

The script copies configuration files into system locations, reloads systemd, and enables/restarts the Python and Cockpit services. Review the script before running it on a new image because it assumes existing packages, users, paths, and permissions.

## First checks

```bash
systemctl status nginx motion cockpit
curl http://127.0.0.1/
curl http://127.0.0.1:8080/json/
mosquitto_sub -h 127.0.0.1 -t '#' -v
```

The MQTT configuration currently permits anonymous access. Restrict this before exposing the broker beyond the trusted ROV network.
