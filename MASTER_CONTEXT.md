# ROV Cockpit — Master Context

> **Role:** Persistent architectural and engineering context for humans and AI assistants working on ROV Cockpit.
>
> **Authority:** Current code and physical bench evidence > current status/roadmap > this file > older documentation and chat recollection.
>
> **Maintenance:** Update this file whenever a significant architectural decision, validated behaviour, deployment mechanism, safety boundary, release milestone, or roadmap priority changes.
>
> **Status discipline:** Never describe simulated, designed, or expected behaviour as physically validated.

---

## 1. Project purpose

ROV Cockpit is a browser-based operator interface for remotely operated and mobile robots.

Cockpit runs **on the Raspberry Pi installed inside the robot**. The operator connects to Cockpit using a web browser. Firefox is the preferred browser, but Chromium-based browsers and Safari should remain supported.

The architecture is intended to support different robot types without requiring substantial changes to the generic Cockpit application.

The initial robot profiles are:

- ROV
- K9
- PiWars

The design is deliberately influenced by Blue Robotics Cockpit, particularly its browser-based operator interface, video handling, telemetry visualisation, attitude HUD, gamepad support, extensibility, and multi-robot-type philosophy. Cockpit is not required to reproduce Blue Robotics Cockpit's implementation, but should emulate useful capabilities where appropriate.

---

## 2. Core deployment model

### Production

One robot has one Raspberry Pi and one Cockpit instance.

```text
Robot
└── Raspberry Pi
    ├── Cockpit
    ├── Control
    ├── Datalogger
    ├── NATS Core
    ├── Nginx
    └── Camera/media services
```

The Raspberry Pi is the robot's computing platform and remains physically installed in the robot.

The operator does not normally run Cockpit locally. The operator uses a browser to connect to the Cockpit instance running on the robot.

### Development

Linux and Windows are supported development platforms.

Development tooling must make it straightforward to run and test Cockpit without requiring the developer workstation to reproduce the complete robot environment.

The standalone Windows bootstrap and portable-runtime mechanisms exist to simplify development and deployment to engineering PCs. They are **development/deployment tooling**, not the production Cockpit architecture.

---

## 3. Operating system

The production platform is:

> **Raspberry Pi OS, the Debian-based operating system provided by the Raspberry Pi Foundation.**

Cockpit should avoid unnecessary dependencies on a particular workstation operating system.

Windows and Linux are development platforms. Production assumptions must not be derived from Windows-specific development tooling.

---

## 4. Repository boundary

Cockpit is maintained separately from the other robot services.

The intended repository boundaries are:

```text
ROV - Cockpit
ROV - Control
ROV - Datalogger
ROV - HiL and SiL
```

Cockpit owns the operator-facing web application.

Control owns hardware-facing control and safety.

Datalogger owns telemetry/data recording and generation of recorded data files.

HiL/SiL is maintained separately and is outside the Cockpit architectural scope.

The repositories communicate through defined interfaces rather than importing each other's implementation.

---

## 5. Service architecture

The production robot uses three primary application services:

```text
                    ┌─────────────────────┐
                    │      Operator       │
                    │  Firefox preferred  │
                    └──────────┬──────────┘
                               │
                          HTTP/WebSocket
                               │
                    ┌──────────▼──────────┐
                    │      Cockpit        │
                    │  Operator interface │
                    └──────────┬──────────┘
                               │
                           NATS Core
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
          Control          Datalogger      Other services
              │                │
              ▼                ▼
          Hardware        Recorded data
```

### Cockpit

Cockpit owns:

- operator presentation;
- browser UI;
- operator input;
- gamepad/keyboard mapping;
- telemetry visualisation;
- camera/media controls;
- camera presentation;
- navigation/HUD presentation;
- access to recorded CSV files;
- publication of operator commands to the configured NATS boundary.

Cockpit does **not** own physical actuator control or the robot's ultimate safety response.

### Control

Control owns:

- hardware-facing commands;
- motor and actuator control;
- physical direction mapping;
- hardware limits;
- neutral behaviour;
- command timeouts;
- failsafe behaviour;
- emergency-stop behaviour;
- physical safety.

Cockpit must never become the robot's only propulsion or actuator safety layer.

### Datalogger

Datalogger owns:

- telemetry recording;
- generation of recorded CSV files;
- long-term data storage;
- data logging configuration;
- recording of agreed NATS subjects.

Datalogger observes the system and must not alter control messages.

Cockpit may provide access to recorded CSV files for operator download, but does not own CSV generation or long-term data storage.

---

## 6. NATS messaging

NATS Core is the selected internal messaging middleware.

Cockpit communicates with Control and other robot services through NATS.

Cockpit does not communicate directly with physical hardware.

NATS subjects use dot notation. Any Cockpit-specific slash notation is handled by the appropriate transport/state adapter rather than changing the NATS convention.

Default configuration:

```text
NATS_URL=nats://127.0.0.1:4222
NATS_SUBJECT=>
```

If NATS is unavailable during development startup, Cockpit may remain available for view-only UI development. Live telemetry and control are unavailable until NATS becomes available.

Expected NATS connection failures must be presented as an explicit Cockpit warning rather than exposing unnecessary library connection tracebacks.

### NATS JetStream

**NATS JetStream is explicitly out of scope for Cockpit.**

Do not introduce JetStream for telemetry persistence, recording, or unrelated functionality without a deliberate architectural decision.

---

## 7. Browser architecture

The operator communicates with Cockpit through the browser.

Firefox is the preferred browser.

Cockpit should also support:

- Chromium-based browsers;
- Safari.

Browser compatibility must therefore avoid unnecessary browser-specific APIs unless a justified compatibility layer exists.

The browser communicates with Cockpit through the application's HTTP and WebSocket interfaces.

Browser clients do not connect directly to NATS.

The frontend must not contain:

- NATS credentials;
- NATS connection URLs;
- NATS clients;
- direct broker access.

---

## 8. FastAPI and WebSocket architecture

Cockpit is implemented as a FastAPI web application.

The application is served through Uvicorn during development and appropriate production service configuration on the Raspberry Pi.

Default development port:

```text
8080
```

The Python package entry point is:

```text
rov_cockpit.app:app
```

The source tree is:

```text
src/rov_cockpit/
```

The browser receives live telemetry through the Cockpit WebSocket.

The intended flow is:

```text
NATS
  │
  ▼
Cockpit transport/state layer
  │
  ▼
Cockpit WebSocket
  │
  ▼
Browser TypeScript state
  │
  ▼
UI components
```

Transport logic must remain outside presentation components.

---

## 9. Frontend architecture

The incremental TypeScript frontend is maintained in:

```text
frontend/src/
```

and compiled into:

```text
src/rov_cockpit/static/dist/
```

The frontend build runs automatically through the application development/startup tooling where required.

The compiled output may remain usable when npm is unavailable, provided the committed output is present.

The TypeScript frontend communicates only with Cockpit's browser-facing interfaces.

### Web Components

The TypeScript Web Component set includes:

- `<rov-heading>`
- `<rov-attitude>`
- `<rov-pitch>`
- `<rov-camera-pitch>`
- `<rov-battery>`
- `<rov-network-status>`
- `<rov-depth>`
- `<rov-hud>`

These components consume shared application state.

They must not contain NATS or WebSocket transport logic.

The `<rov-depth>` component is the first migrated instrument. It consumes:

```text
sensor/water/depth
```

from the TypeScript state model.

Invalid or unavailable depth must be represented explicitly as:

> `Depth unavailable`

The existing inline telemetry routing may remain during incremental migration. Components should be migrated individually rather than introducing an unnecessary frontend rewrite.

---

## 10. Current dashboard presentation

The main attitude instrument is a native SVG/CSS virtual horizon showing:

- roll;
- pitch.

The ROV HUD combines:

- central roll/pitch virtual horizon;
- side depth scales;
- heading tape.

The HUD is a robot-specific presentation. Other robot profiles may omit it.

### Heading

The heading strip is an independent overlay positioned below the top navigation bar.

### Depth

The active depth presentation uses a left-side vertical depth/altitude strip.

It uses:

```text
sensor/water/depth
```

with the required decimetre-to-metre conversion.

The former lower-right Flight Indicator altimeter and top-bar Heading/Depth presentations are not active dashboard presentations.

### Pitch

A separate pitch-only attitude indicator provides nose-up/nose-down inclination.

It consumes:

```text
sensor.ahrs.imu.pitch
```

Non-numeric or unavailable values must not be replaced with invented measurements.

### Camera pitch

A separate camera inclination indicator consumes:

```text
sensor/camera/main/pitch
```

The value is expressed in degrees relative to the ROV body, where:

```text
0 ° = straight ahead
```

The camera-control implementation is responsible for converting its physical servo home position into this representation.

The relationship between the physical servo position and the reported value must be bench validated before the value is described as a measured camera orientation.

---

## 11. Camera and media architecture

Camera support is a Cockpit responsibility.

Cockpit owns:

- camera inventory;
- camera configuration;
- camera-control presentation;
- media controls;
- recording controls;
- still capture;
- gallery/download presentation;
- Nginx media configuration;
- reverse-proxy configuration related to camera streams.

The original monolithic ROV repository must not contain duplicate Cockpit camera or Nginx configuration.

### Camera abstraction

Camera sources must be separated from the browser-facing Cockpit UI.

The architecture should support different camera sources without requiring camera-specific Cockpit UI paths.

Potential sources include:

- CSI cameras;
- USB cameras;
- other supported Linux camera sources.

ROS 2 is **not a Cockpit dependency** and is outside the Cockpit architecture.

If another system provides a camera source to Cockpit in future, it should do so through an appropriate camera/media boundary.

---

## 12. Canonical camera-processing pipeline

The camera system must support processing between capture and output.

The intended architecture is:

```text
Camera
  │
  ▼
Capture
  │
  ▼
Camera processing pipeline
  │
  ├── lens correction
  ├── dewarping
  ├── optional image processing
  │
  ▼
Canonical processed video
  │
  ├───────────────► WebRTC
  │                    │
  │                    ▼
  │                 Browser
  │
  ├───────────────► Recording
  │                    │
  │                    ▼
  │                   Disk
  │
  └───────────────► Still capture
```

There should be a **single canonical processed video feed**.

The WebRTC stream and saved video should originate from that same processed feed.

Therefore:

> **The video presented to the operator and the recorded video should represent the same post-processing output.**

This avoids recording a distorted/raw stream while displaying a corrected stream.

### Lens correction

The processing pipeline should support lens correction and dewarping for different optical systems, including:

- conventional fisheye lenses;
- panoramic/360° cameras;
- other lenses requiring geometric correction.

Dewarping should occur **before recording** where practical so that saved video is already corrected.

Camera-specific correction algorithms belong in the media-processing layer rather than in Cockpit presentation components.

---

## 13. WebRTC

WebRTC is the preferred browser-facing live-video transport where it provides the simplest practical integration with the Raspberry Pi camera/media stack.

The architecture should favour:

- low latency;
- browser compatibility;
- efficient video transport;
- local/offline operation;
- multiple camera streams where practical;
- reuse of the canonical processed video feed.

WebRTC implementation details should remain behind the camera/media abstraction rather than becoming embedded throughout the Cockpit frontend.

The final WebRTC implementation should be selected based on practical Raspberry Pi performance, browser compatibility, maintainability, and integration with the rest of the production stack.

---

## 14. Media storage and Nginx

Nginx provides the required production reverse-proxy/media functionality.

Camera and media configuration belongs to Cockpit.

The supported repeatable Nginx deployment helper is:

```text
scripts/3_configure_nginx.sh
```

It may require `sudo` because it changes system Nginx and systemd state.

It must:

- back up an existing site configuration before replacement;
- validate Nginx before reload;
- report the resulting service state;
- report media/cache state;
- fail safely when validation fails.

---

## 15. Maps

The map supports optional Raspberry Pi Nginx tile caching through:

```text
MAP_TILE_PROXY=true
```

This is intended for deployments where external map access should be reduced or controlled.

Local development may use direct provider URLs by default.

Because Cockpit is offline-first, the core application must not depend on Internet connectivity merely to load or operate its fundamental UI.

---

## 16. Offline-first architecture

Cockpit is designed **offline first**.

Internet access is optional and must not be a fundamental runtime dependency for the robot.

The robot must be capable of operating when no external network is available.

When an external network is unavailable, the Raspberry Pi can provide the robot's local network services, including:

- DHCP;
- gateway/network access as appropriate;
- wireless access;
- captive-portal presentation.

The intended operator flow is:

```text
Existing network available
        │
        ▼
Robot Raspberry Pi
        │
        ▼
Operator browser


No existing network
        │
        ▼
Robot Raspberry Pi
        │
   DHCP / gateway
        │
   local access point
        │
        ▼
Captive portal
        │
        ▼
Operator browser
```

Cockpit's essential UI assets must therefore be locally available.

Do not introduce mandatory CDN dependencies for core functionality.

Network configuration remains a system/networking responsibility rather than becoming a Cockpit-specific implementation concern.

---

## 17. Authentication and authorisation

Authentication is an architectural requirement but may be implemented later in the roadmap.

The architecture must allow authentication and authorisation to be added without a significant Cockpit redesign.

The intended access model is:

- unauthenticated access may be restricted to explicitly permitted view-only functionality;
- driver functionality requires appropriate authorisation;
- administrative functionality requires appropriate authorisation;
- privileged operations must not fundamentally depend on anonymous access.

Authentication must eventually be tested as a real security boundary.

A visible login interface alone is not evidence that authentication is correctly implemented.

---

## 18. Robot profiles

Robot-specific behaviour is defined through validated profiles.

The initial profiles are:

- ROV;
- K9;
- PiWars.

The purpose of profiles is to allow the same Cockpit, Control, and Datalogger service architecture to operate on different robot types and configurations without substantial application-code changes.

The repository source of truth is:

```text
configs/profiles/
```

The deployed runtime copy is initially:

```text
/etc/robot/profile.json
```

The distinction is deliberate:

```text
Repository profile
      │
      │ deployment
      ▼
/etc/robot/profile.json
      │
      ├─────────────┐
      ▼             ▼
   Cockpit       Control
      │             │
      └──────┬──────┘
             ▼
         Datalogger
```

Cockpit, Control, and Datalogger must use the same active profile identity and configuration hash.

A profile change requires a controlled restart or reboot.

Profiles are not intended to be edited independently by each service.

---

## 19. Operator input versus hardware control

Robot profiles must preserve the architectural boundary between operator intent and physical implementation.

Cockpit owns:

- gamepad mapping;
- keyboard mapping;
- operator-facing control configuration;
- generation of operator commands.

Control owns:

- physical motor mapping;
- actuator mapping;
- direction;
- limits;
- safety;
- physical command execution.

This allows the same operator interface to work with different robot hardware without embedding hardware-specific motor logic into Cockpit.

---

## 20. CSV data access

Cockpit provides an operator-facing mechanism to access and download recorded CSV files.

The `/data/` page reads CSV exports from:

```text
CSV_ROOT
```

with the default:

```text
<project>/data/csv
```

Cockpit does not generate the source CSV files.

Datalogger remains responsible for telemetry recording and CSV generation.

Cockpit may provide:

- file selection;
- bounded previews where useful;
- filtering;
- downloads.

Cockpit must not modify the source recording as a side effect of viewing or downloading it.

---

## 21. Repository layout

The expected Cockpit repository structure is:

```text
src/rov_cockpit/
    Python package
    templates
    static assets

frontend/src/
    TypeScript source
    Web Components
    shared frontend state

configs/
    deployment configuration
    camera configuration
    media configuration
    authentication templates
    reverse-proxy configuration
    profiles/

docs/
    engineering documentation
    operational documentation
    deployment documentation
    robot-profile requirements
    current status

tests/
    application tests
    frontend-related tests
    documentation tests
    deployment/documentation policy tests

scripts/
    development setup
    frontend setup/build
    Raspberry Pi provisioning
    Nginx configuration
    application startup
```

Scripts must derive paths from their own location and must not depend on the current working directory.

---

## 22. Development environment

Interactive shell examples should be compatible with Zsh.

Shell scripts may use the interpreter specified by their shebang.

Development tooling should avoid unnecessary system-wide changes.

The Windows standalone bootstrap exists to simplify development on engineering PCs where the user may not have administrator rights.

It must:

- use a project-local Python runtime;
- install project dependencies locally;
- avoid system-wide Python requirements;
- avoid modifying the Windows registry;
- avoid modifying the Windows user/system `PATH`;
- avoid requiring administrator rights unless an explicitly documented external dependency requires them.

The Windows bootstrap is not a production Cockpit deployment mechanism.

Linux development tooling should similarly prefer project-local environments and avoid unnecessary machine-wide modifications.

---

## 23. Frontend build and dependencies

The frontend uses TypeScript.

The frontend helper:

- validates the project-root `package.json`;
- runs npm from the project root;
- propagates npm failures;
- propagates TypeScript failures;
- builds the frontend before application launch where required.

Windows may bootstrap the pinned official Node.js/npm archive into the ignored project-local:

```text
node-runtime/
```

when required.

Checksum verification must be used for downloaded runtime archives.

The helper may temporarily modify the child-process `PATH` when invoking npm, but must not persist changes to the user's or system's environment.

Linux development may use an existing npm installation.

Committed frontend output may be used where npm is unavailable and the required generated files already exist.

---

## 24. Styling

General-purpose styling uses Pico.css.

Cockpit-specific styling is maintained in:

```text
src/rov_cockpit/static/css/cockpit.css
```

MDB is no longer loaded by the templates.

jQuery remains an intentional legacy dependency for Flight Indicator until that library is isolated or replaced.

Do not introduce another frontend framework solely for stylistic reasons.

---

## 25. UI layout rules

The desktop top bar uses:

```text
--rov-nav-height: 60 px
--rov-nav-font-size: 0.75 rem
```

Navigation is non-wrapping and supports controlled horizontal scrolling on narrower desktop viewports.

Heading and network overlays use the same custom-property positioning anchor.

The overlay gap is:

```text
--rov-overlay-gap: 8 px
```

Overlays must remain visually separated from the navigation bar when the navigation height changes.

The navigation popover is a presentation feature for secondary Cockpit routes.

It must not:

- obscure the primary camera/HUD view unnecessarily;
- become a control-safety mechanism;
- interfere with safety-critical operator actions.

---

## 26. Safety boundary

Cockpit is an operator interface.

It is **not the authoritative safety layer**.

Safety-critical behaviour must remain functional if Cockpit crashes, disconnects, loses its browser connection, or stops publishing commands.

Control must provide appropriate:

- command timeouts;
- neutral behaviour;
- failsafe behaviour;
- emergency-stop behaviour;
- hardware protection.

Any change affecting control commands must therefore consider the consequences of:

- lost browser connection;
- lost WebSocket connection;
- lost NATS connection;
- Cockpit process failure;
- stale commands;
- invalid operator input.

---

## 27. Documentation policy

Documentation is part of the implementation.

A behavioural, interface, driver, deployment, architecture, or validation change must update the relevant documentation in the same change.

The master context must also be updated when the change materially affects:

- architecture;
- deployment;
- service ownership;
- safety;
- robot profiles;
- camera/media behaviour;
- authentication;
- communication interfaces;
- validation status;
- roadmap priorities.

The authoritative documentation policy is:

```text
docs/documentation-policy.md
```

Contributor guidance is:

```text
CONTRIBUTING.md
```

Current project status is:

```text
docs/status.md
```

Documentation tests and policy checks must pass locally and in CI where applicable.

---

## 28. Engineering documentation standard

Project documentation uses formal British English.

Use:

- `licence`, not `license`, where referring to the noun;
- `behaviour`;
- `optimise`;
- `centre`.

Use the Oxford comma where it improves clarity.

Write for readers with an engineering degree or equivalent professional experience.

Prefer:

- clear technical terminology;
- explicit assumptions;
- concise engineering prose;
- SI units;
- measurable statements;
- explicit validation status.

Avoid marketing language unless discussing an external product or design reference.

---

## 29. Units and numerical notation

Use SI units with a space between the numerical value and the unit:

```text
5 m
12 V
500 mA
100 ms
1 Hz
20 °C
```

Use the degree symbol `°` for angles and temperatures where appropriate.

Use `degC` only where required by a machine-readable field or protocol.

CSV event and metadata timestamps use local time in:

```text
YYYY-MM-DD HH:MM:SS.ffff
```

format.

They contain exactly four fractional-second digits and do not use the previous ISO `T`, UTC offset, or six-digit precision.

---

## 30. Validation status

Every hardware or software status statement must distinguish the actual level of evidence.

Use terminology such as:

- designed;
- planned;
- implemented;
- simulated;
- software-tested;
- bench-tested;
- bench-probed;
- physically validated;
- production-validated;
- production-proven;
- unverified.

Do not state or imply physical validation when only code, documentation, a vendor SDK, or a simulator has been used.

Never invent hardware validation results.

---

## 31. Coding standards

Python must follow PEP 8.

https://peps.python.org/pep-0008/

Changes should favour the smallest safe implementation that satisfies the requirement.

Do not introduce:

- unnecessary frameworks;
- unnecessary dependencies;
- unrelated refactoring;
- duplicate configuration systems;
- new architectural layers without a demonstrated requirement.

---

## 32. Raspberry Pi provisioning

The supported initial Raspberry Pi provisioning path is:

```text
scripts/0_provision_raspberry_pi.sh
```

It is responsible for initial Raspberry Pi OS provisioning required by Cockpit.

It may install required system packages such as:

- Python;
- Node.js/npm where required;
- Nginx;
- Motion where required by the selected media implementation;
- NATS;
- other explicitly approved production dependencies.

It may create the Cockpit Python environment, deploy the selected robot profile, install the Cockpit systemd unit, and enable/check relevant services.

It must not silently install software from unverified sources.

If a required package is unavailable from configured trusted repositories, provisioning must stop and report the condition.

The provisioning process must be safe to rerun where practical.

---

## 33. Network ownership

Robot network configuration is a system/networking responsibility.

Control remains the owner of robot networking configuration where the deployment requires:

- NetworkManager;
- hostname;
- SMB;
- Avahi;
- fallback networking;
- related robot network configuration.

Cockpit may orchestrate required deployment steps but must not duplicate network configuration ownership.

The Raspberry Pi must support the offline-first operator connection model described above.

---

## 34. Script engineering standard

Future Windows, PowerShell, Bash, and POSIX scripts should use a deliberately diagnostic engineering style.

Scripts should:

- derive absolute paths from their own location;
- validate prerequisites;
- check important external-command exit statuses;
- use explicit paths for project tools and native libraries;
- avoid modifying machine-wide environment state;
- be safe to rerun where practical;
- preserve useful diagnostics after failure;
- avoid deleting user data;
- clean temporary files after successful execution;
- preserve failed temporary state where useful for diagnosis;
- verify downloaded files using checksums or trusted manifests;
- report the final environment state.

Diagnostic output should use:

```text
[INFO]
[PASS]
[WARN]
[FAIL]
[SKIP]
```

Failures should identify:

1. the affected component or path;
2. why the failure matters;
3. the practical corrective action.

The final summary must distinguish between:

- detected;
- installed;
- configured;
- available;
- connected;
- bench-tested;
- physically validated.

Vendor drivers, SDKs, and native components may require separate administrator-approved installation. Such exceptions must be explicitly documented.

---

## 35. AI assistant working rules

When working on Cockpit:

1. Read this file first.
2. Inspect the current implementation when exact behaviour matters.
3. Treat current code and physical evidence as stronger evidence than this file.
4. Distinguish implementation from validation.
5. Never invent a hardware validation result.
6. Identify documentation/code inconsistencies rather than silently choosing one interpretation.
7. Preserve established architecture unless the user explicitly changes it.
8. Keep physical hardware communication out of Cockpit.
9. Keep safety-critical behaviour in Control.
10. Keep telemetry recording and CSV generation in Datalogger.
11. Keep camera/media transport behind appropriate adapters and processing boundaries.
12. Keep WebRTC and camera-specific processing out of generic presentation components.
13. Do not introduce ROS 2 as a Cockpit dependency.
14. Do not introduce NATS JetStream.
15. Preserve offline-first operation.
16. Avoid mandatory Internet/CDN dependencies.
17. Preserve the one-robot/one-Cockpit deployment model.
18. Use robot profiles rather than duplicating robot-specific application logic.
19. Treat authentication as an architectural requirement even where implementation is deferred.
20. Prefer the smallest safe change.
21. Avoid unrelated refactoring.
22. Update documentation when behaviour or architecture changes.

Before implementing a change, consider:

- Which architectural layer owns this?
- Does it cross the Cockpit/Control/Datalogger boundary?
- Does it affect physical safety?
- Does it affect authentication or authorisation?
- Does it affect offline operation?
- Does it affect the robot profile?
- Does it affect camera/video processing?
- Can it be tested without physical hardware?
- Does it introduce a new dependency?
- Does it introduce an Internet dependency?
- Does it require administrator privileges?
- Is it part of the current milestone or future scope?

After implementation:

- run relevant tests;
- check imports;
- check static assets;
- check frontend compilation where applicable;
- verify the WebSocket telemetry path;
- run the application where practical;
- check browser-facing behaviour;
- verify deployment scripts where practical;
- update relevant documentation;
- update this master context if architecture or current behaviour changed;
- clearly report known limitations and unverified behaviour.

---

## 36. Current architectural priorities

The current priorities are:

1. Maintain a reliable Raspberry Pi-based Cockpit deployment.
2. Provide a browser-first operator interface.
3. Preserve offline-first operation.
4. Establish a clean Cockpit/Control/Datalogger/NATS boundary.
5. Support robot-specific behaviour through profiles rather than duplicated application code.
6. Establish a robust camera/media pipeline with WebRTC as the preferred live-video transport.
7. Ensure WebRTC and recorded video originate from the same processed camera feed.
8. Support lens correction and dewarping before recording where practical.
9. Build a useful ROV HUD and telemetry presentation.
10. Provide configurable operator input/gamepad support.
11. Ensure authentication can be introduced without architectural rework.
12. Maintain compatibility with Firefox, Chromium-based browsers, and Safari.
13. Keep the production system maintainable on Raspberry Pi OS.
14. Keep development tooling practical for Windows and Linux engineering workstations.

---

## 37. Explicitly out of scope

The following are outside the current Cockpit architecture unless deliberately reconsidered:

- NATS JetStream;
- ROS 2 as a Cockpit dependency;
- HiL/SiL implementation;
- direct hardware communication from Cockpit;
- Cockpit-owned motor/actuator safety;
- Cockpit-owned CSV generation;
- mandatory Internet connectivity;
- mandatory external CDN resources;
- simultaneous multi-robot operation from one Cockpit instance;
- unnecessary frontend framework replacement;
- unrelated repository-wide refactoring.

---

## 38. Design direction

Cockpit should evolve towards a capable, generic browser-based robot ground-control interface inspired by the strengths of Blue Robotics Cockpit.

Useful capabilities to emulate include:

- configurable operator interfaces;
- multiple video streams;
- low-latency browser video;
- video recording;
- still capture;
- telemetry visualisation;
- attitude/HUD presentation;
- gamepad support;
- configurable operator controls;
- robot-specific profiles;
- extensible widgets and UI components;
- useful operator diagnostics.

These are design directions rather than claims that all features are currently implemented.

The architecture should allow these capabilities to be added incrementally without undermining the fundamental boundaries:

```text
Browser
   │
   ▼
Cockpit
   │
   ▼
NATS Core
   │
   ├── Control
   └── Datalogger

Camera
   │
   ▼
Processing
   │
   ├── WebRTC ─────► Browser
   └── Recording ──► Disk
```

**The fundamental production model remains:**

> **One robot → one Raspberry Pi → one Cockpit → one operator browser connection.**

The Raspberry Pi lives in the robot, Cockpit is the operator-facing web application, Control owns physical control and safety, Datalogger owns recorded data, and NATS Core provides the internal service boundary.

## Customisable operator interface

Customisation is a fundamental Cockpit design requirement.

Cockpit should emulate the configurable operator-interface philosophy demonstrated
by Blue Robotics Cockpit, while adapting it to the ROV project's own architecture,
NATS interfaces, robot profiles, safety model, and offline-first deployment.

The operator interface should not be a fixed collection of hard-coded screens.
It should provide a configurable system in which robot profiles define the
available capabilities and the operator can arrange those capabilities into
appropriate interfaces.

The intended customisation model includes:

### Profiles

A profile represents a robot type, operating mode, or application configuration.

Profiles may define:

- available widgets;
- available views;
- available controls;
- telemetry variables;
- gamepad mappings;
- custom actions;
- camera/video configuration;
- robot-specific presentation.

The existing ROV, K9, and PiWars profiles use this mechanism to allow the same
Cockpit application to support different robots without duplicating the
application.

### Views

A profile may contain multiple Views.

Views allow different operator layouts to be created for different purposes,
for example:

- normal driving;
- inspection;
- navigation;
- camera operation;
- diagnostics;
- engineering/test operation.

Views should be switchable during operation without requiring the application
to restart.

### Widgets

Widgets are the primary building blocks of the operator interface.

Widgets should support, where appropriate:

- adding and removing;
- moving;
- resizing;
- configuration;
- visibility control;
- shared telemetry/state access;
- robot-profile-specific availability.

Widget categories should include, as appropriate:

- video;
- attitude;
- heading;
- depth;
- battery;
- network status;
- maps;
- telemetry indicators;
- plots;
- status indicators;
- controls;
- diagnostic displays.

### Mini-widgets

Compact widgets should be available for areas such as:

- the top bar;
- status areas;
- secondary controls;
- compact telemetry;
- connection status;
- frequently used actions.

### Input widgets

Cockpit should support configurable operator input widgets including, where
appropriate:

- action buttons;
- switches;
- checkboxes;
- dropdowns;
- sliders;
- dials;
- labels.

Input widgets should normally set an operator-facing value or invoke an Action.
They must not bypass the Control service's safety boundary.

### Custom widgets

Cockpit should provide a mechanism for creating custom widgets where practical.

A custom widget should be capable of defining its own:

- presentation;
- styling;
- user interaction;
- application logic.

Custom widgets should access Cockpit's defined state and Action interfaces
rather than connecting directly to NATS or physical hardware.

The preferred implementation should allow custom widgets to be developed without
requiring changes to the core Cockpit application for every new visualisation or
operator control.

### Shared telemetry/state model

Cockpit should maintain a common application state/data model that can be
consumed by widgets.

This provides a similar architectural capability to Blue Robotics Cockpit's
Data Lake, while using the ROV project's own telemetry and NATS architecture.

The state model should expose appropriate:

- vehicle telemetry;
- Cockpit state;
- camera/video state;
- network state;
- operator state;
- profile state;
- control state;
- derived/compound values.

Custom or derived variables may be supported where there is a clear use case.

Widgets should consume this shared state rather than implementing their own
NATS or WebSocket connections.

### Actions

Cockpit should provide a configurable Action system.

Actions may eventually support operations such as:

- sending an operator command through the Cockpit/Control interface;
- switching Views;
- starting/stopping video recording;
- changing camera behaviour;
- changing UI state;
- setting a Cockpit variable;
- invoking approved application functions.

Actions must remain subject to the Cockpit/Control safety boundary.

An Action must never provide a route around Control's physical safety,
limits, timeout, or emergency-stop mechanisms.

Actions should be usable from:

- on-screen controls;
- gamepad/joystick inputs;
- other approved Cockpit events;
- configurable UI elements.

### Gamepad and joystick customisation

Gamepad support should be configurable rather than hard-coded to a single
controller.

The operator should be able to map:

- buttons;
- axes;
- modifiers;
- dead zones;
- direction/inversion where appropriate;

to Cockpit Actions and operator-input functions.

The resulting operator command must still pass through the Control service,
which remains responsible for physical interpretation and safety.

### Telemetry visualisation

Cockpit should support configurable telemetry presentation rather than
requiring every telemetry value to have a dedicated hard-coded widget.

Where practical, generic indicators should allow an operator to select a
telemetry/state variable and configure:

- display name;
- unit;
- scaling;
- numerical precision;
- icon;
- presentation style.

Telemetry plotting should also be configurable, allowing an operator to select
variables and configure useful plot parameters.

### Containers and layout

Widgets should be capable of being grouped into configurable containers.

This allows an operator or profile author to create logical groups of:

- controls;
- status indicators;
- telemetry;
- diagnostic information;
- camera controls.

The layout system should support moving and resizing components without
requiring changes to application source code.

### Import/export

Where practical, profiles, Views, custom widgets, Actions, and related
configuration should support export/import using a portable representation.

This is particularly important for engineering use because a carefully
configured Cockpit interface should be reproducible across robots and
development systems.

Configuration portability must not allow unsafe or incompatible configuration
to bypass profile validation or Control safety constraints.

### Configuration ownership

Customisation belongs to Cockpit, but robot capability and safety remain
defined by the robot profile and Control service.

The boundary is:

    Profile
       │
       ├── declares available capabilities
       │
       ▼
    Cockpit customisation
       │
       ├── Views
       ├── Widgets
       ├── Inputs
       ├── Actions
       └── Gamepad mappings
       │
       ▼
    Operator command
       │
       ▼
    NATS Core
       │
       ▼
    Control
       │
       └── physical limits and safety

Cockpit customisation must therefore determine **how the operator interacts
with the robot**, not redefine **what the robot is physically permitted to do**.

This customisation architecture is a design goal. Individual capabilities are
not considered implemented until they exist in the current code and have been
appropriately tested.

### Attitude instrument

The primary attitude instrument is `<rov-attitude>`, a native SVG/CSS
virtual-horizon display.

It presents the ROV's:

- roll;
- pitch.

The instrument consumes attitude values from the shared TypeScript telemetry
state and contains no NATS, WebSocket, or other transport logic.

The primary attitude instrument is distinct from the separate `<rov-pitch>`
instrument, which presents pitch-only nose-up/nose-down inclination.

The ROV profile may additionally use `<rov-hud>`, which incorporates a
virtual-horizon attitude presentation together with depth scales and a
heading tape. The HUD is a ROV-specific composite presentation and does not
replace the generic attitude component architecture.

Invalid, unavailable, or non-numeric attitude values must be represented as
unavailable rather than replaced with an assumed or fabricated measurement.