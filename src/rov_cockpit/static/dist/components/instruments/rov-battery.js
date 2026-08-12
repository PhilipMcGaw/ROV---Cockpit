import { TOPICS } from "../../telemetry/topics.js";
import { TelemetryInstrument } from "./instrument-base.js";
export class RovBattery extends TelemetryInstrument {
    renderShell() { this.shell("fa-battery-half", "Battery"); }
    read(u) { return u.state.numeric.get(TOPICS.batteryPercentage) ?? null; }
    format(r) { if (!r.valid || r.value === null || !Number.isFinite(r.value))
        return null; const percentage = r.value * 10; return `${Math.max(0, Math.min(100, Math.round(percentage)))} %`; }
}
customElements.get("rov-battery") || customElements.define("rov-battery", RovBattery);
//# sourceMappingURL=rov-battery.js.map