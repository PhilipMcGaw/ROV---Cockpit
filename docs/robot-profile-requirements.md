# Robot Profile Framework Requirements

## Purpose

The Cockpit and Controller shall use one common, versioned framework across the ROV, K9, PiWars, and future robot projects. Robot-specific behaviour shall be expressed through a validated profile and Controller configuration rather than duplicated application code.

## Deployment model

Each robot shall have its own Raspberry Pi for the foreseeable future. Cockpit, Controller, and Datalogger are separate repositories and services, but are installed together on that robot Pi and shall use one active robot profile. They exchange commands, telemetry, status, and logging data through NATS Core. HiL/SiL is separate: it runs in a virtual machine and connects to a headless robot or headless robot services through the same application-facing interfaces.

Profile selection is an installation or maintenance operation performed over SSH, not an operator UI function. Git is the source of truth for framework code, profiles, schemas, and documentation. A deployment shall record the robot name, profile name, framework Git revision, profile revision or commit, configuration hash, and deployment date.

Profiles shall be loaded and validated during system boot before Cockpit, Controller, or Datalogger is allowed to start. Profile changes shall require a controlled service restart or reboot; live profile replacement is not required.

## Profile format and scope

At present, robot profiles shall live in the Cockpit repository under `configs/profiles/`. The Cockpit repository is the source of truth for the profile files. The active profile shall be made available to Control and Datalogger through the robot deployment path without creating independently edited copies. All robot profiles shall use the same JSON format and schema. The profile shall be validated before activation and shall include a schema version. Profiles may define robot identity, branding, enabled capabilities, namespaced telemetry and logical command subjects, SI units, raw-value scaling, display precision, unavailable-value behaviour, dashboard layout, cameras, media, and operator input mappings.

On the Raspberry Pi, the active profile shall be installed at a shared deployment path, initially `/etc/robot/profile.json`. Cockpit, Control, and Datalogger shall all read this same file at boot.

The profile may define the robot hostname and unique fallback network identity. The current fallback network convention is `192.168.42.0/24`; fallback addresses must remain unique when multiple robots share a wired network.

Each profile shall define one default camera and support any number of additional cameras. Camera device paths and stream endpoints shall be configuration data, not hard-coded application assumptions.

Camera sources shall pass through an extensible processing pipeline before reaching the common Nginx stream endpoint. The pipeline shall support source adapters for Raspberry Pi CSI, USB, and ROS 2 virtual cameras, with optional processing stages such as lens de-warping. Processing stages shall be profile-configurable so they can be introduced without changing the Cockpit camera UI or Nginx routing.

## Namespace and control boundary

Every robot shall have a distinct namespace, such as `rov`, `k9`, or `piwars`. Command and telemetry subjects shall be distinct and shall be defined by the profile. Profile validation shall reject duplicate or ambiguous mappings.

The Cockpit may map operator inputs to logical robot commands. It shall not map logical commands to individual motors, thrusters, or physical actuator channels. The Controller owns motor direction, mixing, inversion, limits, ramps, neutral behaviour, timeouts, emergency stop, and all hardware mappings.

Control also owns deployment of the approved Raspberry Pi robot-network configuration and runtime network/NATS health. Network-link loss and NATS command loss shall be handled safely by Control and shall not depend on Cockpit or Datalogger.

Wi-Fi credentials and other deployment secrets, including NATS credentials, service tokens, and API keys, may initially be kept in one local, ignored Control secrets file on the robot. Secrets must not be included in the shared robot profile or committed to Git. The deployment shall use restrictive file permissions and document the required fields through a safe example template without publishing secret values.

## Example profiles

The framework shall provide functional ROV, K9, and PiWars profiles. K9 shall include its optional soundboard capability. PiWars shall support configurable competition-oriented controls and sensors. Where physical hardware is not yet available, the examples shall run against mock or simulated Controller behaviour and shall label unverified or planned capabilities explicitly.

## Consistency and maintenance

Common framework improvements shall be made to shared code and tested against all example profiles. Robot-specific differences shall not be implemented by copying or permanently forking the Cockpit. Profile, schema, interface, safety, deployment, and documentation changes shall be reviewed together.

Every behaviour-affecting change shall update the relevant `MASTER_CONTEXT.md`, `README.md`, and `docs/` page. Automated documentation and profile-validation checks shall run locally and in CI.
