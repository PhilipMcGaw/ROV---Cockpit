import { TOPICS } from "../../telemetry/topics.js";
import { TelemetryInstrument } from "./instrument-base.js";
export class RovNetworkStatus extends TelemetryInstrument {
    renderShell() { this.shell("fa-network-wired", "Network"); }
    read(u) { return u.state.numeric.get(TOPICS.networkStatus) ?? null; }
    format(r) { return r.raw && r.raw.trim() ? r.raw : null; }
}
customElements.get("rov-network-status") || customElements.define("rov-network-status", RovNetworkStatus);
//# sourceMappingURL=rov-network-status.js.map