import { TOPICS } from "../../telemetry/topics.js";
import { TelemetryInstrument } from "./instrument-base.js";
import type { NumericTelemetry, TelemetryStateUpdate } from "../../telemetry/types.js";
export class RovHeading extends TelemetryInstrument { protected renderShell(): void { this.shell("fa-compass", "Heading"); } protected read(u: TelemetryStateUpdate): NumericTelemetry | null { return u.state.numeric.get(TOPICS.heading) ?? null; } protected format(r: NumericTelemetry): string | null { return r.valid && r.value !== null && Number.isFinite(r.value) ? `${Math.round(((r.value % 360) + 360) % 360)}°` : null; } }
customElements.get("rov-heading") || customElements.define("rov-heading", RovHeading);
