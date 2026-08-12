import { TOPICS } from "../../telemetry/topics.js";
import { TelemetryInstrument } from "./instrument-base.js";
export class RovCameraPitch extends TelemetryInstrument {
    renderShell() { this.shell("fa-camera", "Camera pitch"); }
    read(u) { return u.state.numeric.get(TOPICS.cameraPitch) ?? null; }
    format(r) { return r.valid && r.value !== null && Number.isFinite(r.value) ? `${r.value.toFixed(1)}°` : null; }
}
customElements.get("rov-camera-pitch") || customElements.define("rov-camera-pitch", RovCameraPitch);
//# sourceMappingURL=rov-camera-pitch.js.map