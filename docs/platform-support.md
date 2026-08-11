# Platform support

The Cockpit web application is intended to be platform-independent. The hardware control loop has a smaller support surface because GPIO, I2C, SPI, PWM, and serial devices are platform-specific.

| Capability | Windows | macOS | Linux / Raspberry Pi |
|---|:---:|:---:|:---:|
| Cockpit development server | Supported | Supported | Supported |
| MQTT-backed dashboard with a local broker | Supported | Supported | Supported |
| Camera UI and configuration inventory | UI supported; Motion not expected | UI supported; Motion not expected | Supported with Motion/Nginx |
| Control-loop import/syntax work | Supported where dependencies install | Supported where dependencies install | Supported |
| GPIO/I2C/SPI/PWM hardware control | Not supported | Not supported | Target platform |
| Raspberry Pi camera and Motion service | Not supported | Not supported | Target platform |

Use mock or disconnected hardware for Windows and macOS development. A successful Cockpit start does not prove that the physical control loop or camera stack is operational.

## Browser Gamepad API

The Cockpit gamepad page uses the standard Browser Gamepad API. It is supported on Windows and macOS by current Edge, Chrome, and Firefox releases; Safari also supports it on macOS. The controller must first be paired by the operating system and exposed as a standard HID/gamepad device.

For local development, serve the Cockpit from `localhost` or `127.0.0.1`. Remote deployments should use HTTPS. Firefox may require the user to press a controller button before the browser exposes the device to the page.

Gamepad input must be tested with propulsion disabled or disconnected. The system should use dead-man handling, neutral output on disconnect, an explicit arm state, and input timeouts; browser detection must not be the only motor safety mechanism.

## Cockpit authentication

View-only Cockpit access is anonymous. Driver and administrator functions use the file-backed login system in `Configs/users.json`, with signed expiring session cookies. Drivers may change their own password; administrators may change their own and other configured account passwords. Set `COCKPIT_AUTH_SECRET` to a strong deployment-specific value and use HTTPS when the Cockpit is reachable beyond the local machine.

## Windows bootstrap rationale

The Windows workflow is deliberately portable and user-installable. It rejects UNC paths because local filesystem semantics are more predictable for Python environments and child processes. It downloads and verifies a project-local WinPython runtime so setup does not depend on system Python, registry state, administrator PATH changes, or administrator rights. It uses that runtime's `pip` instead of adding `uv` as another required bootstrap dependency.

The installer still requires permission to write inside the chosen project directory and network access to the official WinPython and Python package hosts. It does not require elevation or system-wide software installation.

## Platform rules

- On Windows, use the project-local `runtime\python.exe` and `pip` against the shared `requirements.txt`; do not require `uv`.
- On macOS/Linux, use `uv` to create `.venv` and install the same shared `requirements.txt`; no lockfile is required.
- Keep platform-specific hardware access behind small adapters so the web layer remains portable.
- Use stable Linux `/dev/serial/by-id/` paths where possible rather than `/dev/ttyUSB0`.
- Treat any hardware path as `demo`, `simulated`, `bench tested`, or `production proven`; do not imply a stronger status than has been verified.
