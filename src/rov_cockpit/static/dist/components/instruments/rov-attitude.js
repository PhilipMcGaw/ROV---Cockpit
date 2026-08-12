import { TOPICS } from "../../telemetry/topics.js";
import { TelemetryInstrument } from "./instrument-base.js";
export class RovAttitude extends TelemetryInstrument {
    renderShell() { this.shell("fa-plane", "Attitude"); }
    read(u) { return u.state.numeric.get(TOPICS.pitch) ?? null; }
    format(r) { return r.valid && r.value !== null && Number.isFinite(r.value) ? `${r.value.toFixed(1)}° pitch` : null; }
}
customElements.get("rov-attitude") || customElements.define("rov-attitude", RovAttitude);
//# sourceMappingURL=rov-attitude.js.map