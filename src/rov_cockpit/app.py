"""ROV Cockpit web application."""

import csv
import io
import json
import os
import re
import asyncio
import shutil
import threading
import urllib.request
from datetime import datetime, timezone
from urllib.parse import parse_qs
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import nats
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field
from .auth import SESSION_COOKIE, create_session, hash_password, load_users, read_session, save_users, verify_password

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parents[1]
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"
DEFAULT_CAMERA_CONFIG = PROJECT_ROOT / "configs" / "cameras.json"
CAMERA_CONFIG_PATH = Path(os.getenv("CAMERA_CONFIG", str(DEFAULT_CAMERA_CONFIG)))
NATS_URL = os.getenv("NATS_URL", "nats://127.0.0.1:4222")
NATS_SUBJECT = os.getenv("NATS_SUBJECT", ">")
MAP_TILE_PROXY = os.getenv("MAP_TILE_PROXY", "false").lower() == "true"
MEDIA_ROOT = Path(os.getenv("MEDIA_ROOT", str(PROJECT_ROOT / "media")))
CSV_ROOT = Path(os.getenv("CSV_ROOT", str(PROJECT_ROOT / "data" / "csv")))
STILLS_DIR = MEDIA_ROOT / "stills"
VIDEOS_DIR = MEDIA_ROOT / "videos"
MEDIA_MIN_FREE_GB = float(os.getenv("MEDIA_MIN_FREE_GB", "2"))
MEDIA_CONFIG_PATH = PROJECT_ROOT / "configs" / "media.json"
USERS_PATH = PROJECT_ROOT / "configs" / "users.json"
AUTH_SECRET = os.getenv("COCKPIT_AUTH_SECRET", "change-this-cockpit-secret")

templates = Jinja2Templates(directory=str(TEMPLATES_DIR))
nats_data: dict[str, str] = {}
nats_lock = threading.Lock()
telemetry_clients: set[WebSocket] = set()
telemetry_loop: asyncio.AbstractEventLoop | None = None


class CameraConfig(BaseModel):
    """Configuration for one Motion camera instance."""

    id: str = Field(pattern=r"^[a-zA-Z0-9_-]+$")
    name: str = Field(min_length=1, max_length=80)
    device: str = Field(min_length=1, max_length=120)
    enabled: bool = True
    width: int = Field(default=640, ge=160, le=3840)
    height: int = Field(default=480, ge=120, le=2160)
    framerate: int = Field(default=30, ge=1, le=120)
    stream_port: int = Field(default=8001, ge=1024, le=65535)


class MediaConfig(BaseModel):
    """Recording settings shared by Motion and the Cockpit."""

    recording_minutes: int = Field(default=30, ge=1, le=240)


def load_media_config() -> MediaConfig:
    try:
        return MediaConfig.model_validate(json.loads(MEDIA_CONFIG_PATH.read_text(encoding="utf-8")))
    except (FileNotFoundError, json.JSONDecodeError):
        return MediaConfig()


def save_media_config(config: MediaConfig) -> None:
    MEDIA_CONFIG_PATH.write_text(json.dumps(config.model_dump(), indent=2) + "\n", encoding="utf-8")
    motion_config = PROJECT_ROOT / "configs" / "motion.conf"
    if motion_config.is_file():
        content = motion_config.read_text(encoding="utf-8")
        content = re.sub(r"^movie_max_time\s+\d+\s*$", f"movie_max_time {config.recording_minutes * 60}", content, flags=re.MULTILINE)
        motion_config.write_text(content, encoding="utf-8")


def media_files(directory: Path, suffixes: tuple[str, ...]) -> list[Path]:
    """Return media files in newest-first order, without leaving MEDIA_ROOT."""
    directory.mkdir(parents=True, exist_ok=True)
    return sorted(
        (path for path in directory.iterdir() if path.is_file() and path.suffix.lower() in suffixes),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )


def csv_files() -> list[Path]:
    CSV_ROOT.mkdir(parents=True, exist_ok=True)
    return sorted((path for path in CSV_ROOT.rglob("*.csv") if path.is_file()), key=lambda path: path.stat().st_mtime, reverse=True)


def csv_path(filename: str) -> Path:
    root = CSV_ROOT.resolve()
    candidate = (CSV_ROOT / filename).resolve()
    if root != candidate and root not in candidate.parents:
        raise HTTPException(status_code=400, detail="CSV path is outside the configured data directory")
    if candidate.suffix.lower() != ".csv" or not candidate.is_file():
        raise HTTPException(status_code=404, detail="CSV export was not found")
    return candidate


def csv_fields(path: Path) -> list[str]:
    with path.open("r", newline="", encoding="utf-8-sig") as handle:
        return csv.DictReader(handle).fieldnames or []


def prune_videos() -> None:
    """Remove oldest recordings until the configured free-space floor is met."""
    VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
    usage = shutil.disk_usage(MEDIA_ROOT)
    minimum_free = int(MEDIA_MIN_FREE_GB * 1024**3)
    for video in reversed(media_files(VIDEOS_DIR, (".mp4", ".avi", ".mkv", ".webm"))):
        if usage.free >= minimum_free:
            break
        try:
            video.unlink()
        except OSError:
            continue
        usage = shutil.disk_usage(MEDIA_ROOT)


def capture_still(camera_id: str) -> Path:
    """Save the current JPEG frame from a Motion camera stream."""
    camera = next((item for item in load_camera_config()["cameras"] if item["id"] == camera_id), None)
    if camera is None:
        raise HTTPException(status_code=404, detail="Unknown camera")
    url = f"http://127.0.0.1:{camera['stream_port']}/0/current"
    STILLS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{camera_id}_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S_%fZ')}.jpg"
    destination = STILLS_DIR / filename
    try:
        with urllib.request.urlopen(url, timeout=5) as response:
            destination.write_bytes(response.read())
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Camera {camera_id} is unavailable") from exc
    prune_videos()
    return destination


async def media_maintenance() -> None:
    """Keep recording retention active while the Cockpit is running."""
    while True:
        prune_videos()
        await asyncio.sleep(60)


def dashboard_topic(subject: str) -> str:
    """Present NATS subjects using the existing dashboard topic notation."""
    return subject.replace(".", "/")


async def on_message(message: Any) -> None:
    """Store the latest value for each NATS subject."""
    topic = dashboard_topic(message.subject)
    payload = message.data.decode(errors="replace")
    with nats_lock:
        nats_data[topic] = payload


async def nats_error_callback(exc: Exception) -> None:
    """Suppress library retry tracebacks; startup reports read-only mode once."""
    return None


async def connect_nats_in_background(app: FastAPI) -> None:
    """Attempt NATS connection without delaying read-only Cockpit startup."""
    try:
        client = await asyncio.wait_for(
            nats.connect(
                NATS_URL,
                connect_timeout=3,
                max_reconnect_attempts=0,
                error_cb=nats_error_callback,
            ),
            timeout=4,
        )
        await client.subscribe(NATS_SUBJECT, cb=on_message)
        app.state.nats_client = client
        print(f"[PASS] NATS client connected: {NATS_URL} subject={NATS_SUBJECT}")
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        app.state.nats_client = None
        print(f"[WARN] NATS Server is unavailable at {NATS_URL}: {exc}")
        print("[INFO] Cockpit is running in read-only mode; live telemetry and control are unavailable.")

    if telemetry_loop is not None and telemetry_loop.is_running():
        asyncio.run_coroutine_threadsafe(
            broadcast_telemetry(topic, payload), telemetry_loop
        )


async def broadcast_telemetry(topic: str, payload: str) -> None:
    """Forward one NATS update to connected cockpit browsers."""
    disconnected = set()
    for websocket in tuple(telemetry_clients):
        try:
            await websocket.send_json({"topic": topic, "value": payload})
        except Exception:
            disconnected.add(websocket)
    telemetry_clients.difference_update(disconnected)


def load_camera_config() -> dict[str, list[dict[str, Any]]]:
    """Load the camera registry, returning an empty registry if absent."""
    try:
        return json.loads(CAMERA_CONFIG_PATH.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {"cameras": []}
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Invalid camera configuration: {exc}") from exc


def save_camera_config(config: dict[str, list[dict[str, Any]]]) -> None:
    """Atomically replace the camera registry."""
    CAMERA_CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = CAMERA_CONFIG_PATH.with_suffix(".tmp")
    temporary_path.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
    temporary_path.replace(CAMERA_CONFIG_PATH)


def topic_value(topic: str) -> str:
    """Return a cached NATS value or the dashboard's missing-value marker."""
    return nats_data.get(topic, "N/A")


def dashboard_snapshot() -> list[dict[str, Any]]:
    """Build the stable, dashboard-oriented NATS response."""
    with nats_lock:
        return [
            {
                "id": "System",
                "Uptime": topic_value("system/uptime"),
                "Date": topic_value("system/date"),
                "Time": topic_value("system/time"),
            },
            {
                "id": "Battery",
                "SOC": topic_value("power/battery/1/soc"),
                "Voltage": topic_value("power/battery/1/voltage"),
                "Current": topic_value("power/battery/1/current"),
                "Temperature": topic_value("power/battery/1/temperature"),
            },
            {
                "id": "Water",
                "Temperature": topic_value("sensor/water/temperature"),
                "Salinity": topic_value("sensor/water/salinity"),
            },
            {
                "id": "Direction",
                "Heading": topic_value("sensor/ahrs/imu/heading"),
                "Pitch": topic_value("sensor/ahrs/imu/pitch"),
                "Roll": topic_value("sensor/ahrs/imu/roll"),
            },
            {
                "id": "Location",
                "Latitude": topic_value("sensor/ahrs/gps/location/lat"),
                "Longitude": topic_value("sensor/ahrs/gps/location/lng"),
                "Altitude": topic_value("sensor/ahrs/gps/location/altitude"),
            },
            {
                "id": "Lights",
                "Left": topic_value("output/lights/left"),
                "Right": topic_value("output/lights/right"),
                "Aux1": topic_value("output/lights/aux1"),
                "Aux2": topic_value("output/lights/aux2"),
                "Laser": topic_value("output/lights/laser"),
                "Test": topic_value("output/lights/test"),
            },
            {
                "id": "Motors",
                **{
                    f"Motor{motor}speed": topic_value(f"output/motors/motor{motor}/speed")
                    for motor in range(1, 13)
                },
            },
        ]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start and stop the NATS client with the ASGI application."""
    global telemetry_loop
    telemetry_loop = asyncio.get_running_loop()
    maintenance_task = asyncio.create_task(media_maintenance())
    app.state.nats_client = None
    nats_task = asyncio.create_task(connect_nats_in_background(app))

    yield

    nats_task.cancel()
    await asyncio.gather(nats_task, return_exceptions=True)
    if app.state.nats_client is not None:
        await app.state.nats_client.drain()
        print("NATS client stopped")
    telemetry_loop = None
    maintenance_task.cancel()


app = FastAPI(title="ROV Cockpit", lifespan=lifespan)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    """Serve the conventional root favicon URL used by browsers."""
    return FileResponse(STATIC_DIR / "favicon.ico")


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(request=request, name="home.jinja")


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    error = None if USERS_PATH.is_file() else "No user accounts are configured yet. Create configs/users.json from configs/users.example.json."
    return templates.TemplateResponse(request=request, name="login.jinja", context={"error": error})


@app.post("/login", response_class=HTMLResponse)
async def login(request: Request):
    form = parse_qs((await request.body()).decode("utf-8"))
    username = form.get("username", [""])[0]
    password = form.get("password", [""])[0]
    user = load_users(USERS_PATH).get(username)
    if not user or not verify_password(password, user.get("password_hash", "")):
        return templates.TemplateResponse(request=request, name="login.jinja", context={"error": "Invalid username or password"}, status_code=401)
    response = RedirectResponse(url="/", status_code=303)
    response.set_cookie(SESSION_COOKIE, create_session(username, user["role"], AUTH_SECRET), httponly=True, samesite="lax")
    return response


@app.post("/logout")
async def logout():
    response = RedirectResponse(url="/", status_code=303)
    response.delete_cookie(SESSION_COOKIE)
    return response


@app.get("/logout")
async def logout_link():
    return await logout()


def authenticated_user(request: Request) -> dict[str, str] | None:
    return read_session(request.cookies.get(SESSION_COOKIE), AUTH_SECRET)


@app.get("/api/session")
async def session_info(request: Request):
    user = authenticated_user(request)
    return {"authenticated": user is not None, "username": user["user"] if user else None, "role": user["role"] if user else None}


@app.get("/account/", response_class=HTMLResponse)
async def account_page(request: Request):
    user = authenticated_user(request)
    if user is None:
        return RedirectResponse(url="/login", status_code=303)
    users = load_users(USERS_PATH)
    managed_users = sorted(users) if user["role"] == "admin" else [user["user"]]
    return templates.TemplateResponse(request=request, name="account.jinja", context={"user": user, "managed_users": managed_users, "message": None, "error": None})


@app.post("/account/password")
async def change_password(request: Request):
    form = parse_qs((await request.body()).decode("utf-8"))
    username = form.get("username", [""])[0]
    password = form.get("password", [""])[0]
    user = authenticated_user(request)
    if user is None:
        return RedirectResponse(url="/login", status_code=303)
    if user["role"] != "admin" and username != user["user"]:
        raise HTTPException(status_code=403, detail="Drivers may only change their own password")
    if len(password) < 12:
        raise HTTPException(status_code=400, detail="Password must be at least 12 characters")
    users = load_users(USERS_PATH)
    if username not in users:
        raise HTTPException(status_code=404, detail="User not found")
    users[username]["password_hash"] = hash_password(password)
    save_users(USERS_PATH, users)
    return RedirectResponse(url="/account/", status_code=303)


@app.get("/api/network-ping")
async def network_ping() -> dict[str, int]:
    """Small uncached response used by the cockpit's browser rate estimate."""
    return {"ok": 1}


@app.websocket("/ws/telemetry")
async def telemetry_socket(websocket: WebSocket):
    """Provide NATS telemetry to browsers without exposing NATS directly."""
    await websocket.accept()
    telemetry_clients.add(websocket)
    try:
        with nats_lock:
            snapshot = dict(nats_data)
        for topic, value in snapshot.items():
            await websocket.send_json({"topic": topic, "value": value})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        telemetry_clients.discard(websocket)


@app.get("/files/", response_class=HTMLResponse)
async def files(request: Request):
    prune_videos()
    return templates.TemplateResponse(
        request=request,
        name="files.jinja",
        context={
            "cameras": load_camera_config()["cameras"],
            "media_config": load_media_config(),
            "stills": media_files(STILLS_DIR, (".jpg", ".jpeg", ".png")),
            "videos": media_files(VIDEOS_DIR, (".mp4", ".avi", ".mkv", ".webm")),
        },
    )


@app.get("/data/", response_class=HTMLResponse)
async def data_page(request: Request):
    return templates.TemplateResponse(request=request, name="data.jinja", context={"files": [{"name": path.name, "relative": path.relative_to(CSV_ROOT).as_posix()} for path in csv_files()]})


@app.get("/api/data/fields")
async def data_fields(file: str):
    return {"fields": csv_fields(csv_path(file))}


@app.get("/api/data/preview")
async def data_preview(file: str, sensors: str = "", limit: int = 250):
    path = csv_path(file)
    selected = [item for item in sensors.split(",") if item]
    with path.open("r", newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        fields = [field for field in (reader.fieldnames or []) if not selected or field in selected]
        rows = [[row.get(field, "") for field in fields] for row in reader][:max(1, min(limit, 250))]
    return {"file": path.name, "fields": fields, "rows": rows}


@app.get("/api/data/download")
async def data_download(file: str, sensors: str = ""):
    path = csv_path(file)
    selected = [item for item in sensors.split(",") if item]
    output = io.StringIO(newline="")
    with path.open("r", newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        fields = [field for field in (reader.fieldnames or []) if not selected or field in selected]
        writer = csv.writer(output)
        writer.writerow(fields)
        for row in reader:
            writer.writerow([row.get(field, "") for field in fields])
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{path.stem}-selected.csv"'})


@app.get("/api/media/config")
async def get_media_config():
    return load_media_config()


@app.put("/api/media/config")
async def update_media_config(config: MediaConfig):
    save_media_config(config)
    return {"config": config, "restart_required": True}


@app.post("/api/cameras/{camera_id}/still")
async def save_still(camera_id: str):
    still = capture_still(camera_id)
    return {"filename": still.name, "url": f"/media/stills/{still.name}"}


@app.get("/media/{media_type}/{filename}")
async def download_media(media_type: str, filename: str):
    directories = {"stills": STILLS_DIR, "videos": VIDEOS_DIR}
    directory = directories.get(media_type)
    if directory is None or Path(filename).name != filename:
        raise HTTPException(status_code=404, detail="Media not found")
    path = directory / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Media not found")
    return FileResponse(path, filename=path.name)


@app.get("/map/", response_class=HTMLResponse)
async def map_page(request: Request):
    tile_prefix = "/map-tiles" if MAP_TILE_PROXY else None
    return templates.TemplateResponse(
        request=request,
        name="map.jinja",
        context={"map_tile_prefix": tile_prefix},
    )


@app.get("/3d/", response_class=HTMLResponse)
async def threed(request: Request):
    return templates.TemplateResponse(request=request, name="3d.jinja")


@app.get("/cameras/", response_class=HTMLResponse)
async def cameras_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="cameras.jinja",
        context={"cameras": load_camera_config()["cameras"]},
    )


@app.get("/gamepad/", response_class=HTMLResponse)
async def gamepad_page(request: Request):
    return templates.TemplateResponse(request=request, name="gamepad.jinja")


@app.get("/api/cameras")
async def get_cameras():
    return load_camera_config()


@app.put("/api/cameras/{camera_id}")
async def update_camera(camera_id: str, camera: CameraConfig):
    if camera.id != camera_id:
        raise HTTPException(status_code=400, detail="Camera ID in URL and body must match")

    config = load_camera_config()
    cameras = [item for item in config["cameras"] if item["id"] != camera_id]
    cameras.append(camera.model_dump())
    config["cameras"] = sorted(cameras, key=lambda item: item["id"])
    save_camera_config(config)
    return camera


@app.get("/json/")
async def get_nats():
    return dashboard_snapshot()


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host=os.getenv("APP_HOST", "0.0.0.0"),
        port=int(os.getenv("APP_PORT", "8080")),
        reload=os.getenv("APP_RELOAD", "false").lower() == "true",
    )
