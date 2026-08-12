import { TOPICS } from "../../telemetry/topics.js";
import { TelemetryInstrument } from "./instrument-base.js";
import type { NumericTelemetry, TelemetryStateUpdate } from "../../telemetry/types.js";
export class RovCameraPitch extends TelemetryInstrument { protected renderShell(): void { this.shell("fa-camera", "Camera pitch"); } protected read(u: TelemetryStateUpdate): NumericTelemetry | null { return u.state.numeric.get(TOPICS.cameraPitch) ?? null; } protected format(r: NumericTelemetry): string | null { return r.valid && r.value !== null && Number.isFinite(r.value) ? `${r.value.toFixed(1)}°` : null; } }
customElements.get("rov-camera-pitch") || customElements.define("rov-camera-pitch", RovCameraPitch);
