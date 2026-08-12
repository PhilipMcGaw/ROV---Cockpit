import { TOPICS } from "../../telemetry/topics.js";
import { TelemetryInstrument } from "./instrument-base.js";
export class RovHeading extends TelemetryInstrument {
    renderShell() { this.shell("fa-compass", "Heading"); }
    read(u) { return u.state.numeric.get(TOPICS.heading) ?? null; }
    format(r) { return r.valid && r.value !== null && Number.isFinite(r.value) ? `${Math.round(((r.value % 360) + 360) % 360)}°` : null; }
}
customElements.get("rov-heading") || customElements.define("rov-heading", RovHeading);
//# sourceMappingURL=rov-heading.js.map