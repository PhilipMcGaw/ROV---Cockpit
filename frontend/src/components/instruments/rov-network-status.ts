import { TOPICS } from "../../telemetry/topics.js";
import { TelemetryInstrument } from "./instrument-base.js";
import type { NumericTelemetry, TelemetryStateUpdate } from "../../telemetry/types.js";
export class RovNetworkStatus extends TelemetryInstrument { protected renderShell(): void { this.shell("fa-network-wired", "Network"); } protected read(u: TelemetryStateUpdate): NumericTelemetry | null { return u.state.numeric.get(TOPICS.networkStatus) ?? null; } protected format(r: NumericTelemetry): string | null { return r.raw && r.raw.trim() ? r.raw : null; } }
customElements.get("rov-network-status") || customElements.define("rov-network-status", RovNetworkStatus);
