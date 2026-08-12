import { TOPICS } from "../../telemetry/topics.js";
import { TelemetryInstrument } from "./instrument-base.js";
import type { NumericTelemetry, TelemetryStateUpdate } from "../../telemetry/types.js";
export class RovBattery extends TelemetryInstrument { protected renderShell(): void { this.shell("fa-battery-half", "Battery"); } protected read(u: TelemetryStateUpdate): NumericTelemetry | null { return u.state.numeric.get(TOPICS.batteryPercentage) ?? null; } protected format(r: NumericTelemetry): string | null { if (!r.valid || r.value === null || !Number.isFinite(r.value)) return null; const percentage = r.value * 10; return `${Math.max(0, Math.min(100, Math.round(percentage)))} %`; } }
customElements.get("rov-battery") || customElements.define("rov-battery", RovBattery);
