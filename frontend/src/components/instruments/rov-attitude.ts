import { TOPICS } from "../../telemetry/topics.js";
import { TelemetryInstrument } from "./instrument-base.js";
import type { NumericTelemetry, TelemetryStateUpdate } from "../../telemetry/types.js";
export class RovAttitude extends TelemetryInstrument { protected renderShell(): void { this.shell("fa-plane", "Attitude"); } protected read(u: TelemetryStateUpdate): NumericTelemetry | null { return u.state.numeric.get(TOPICS.pitch) ?? null; } protected format(r: NumericTelemetry): string | null { return r.valid && r.value !== null && Number.isFinite(r.value) ? `${r.value.toFixed(1)}° pitch` : null; } }
customElements.get("rov-attitude") || customElements.define("rov-attitude", RovAttitude);
