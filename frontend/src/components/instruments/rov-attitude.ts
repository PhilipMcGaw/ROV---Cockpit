import { TOPICS } from "../../telemetry/topics.js";
import type { NumericTelemetry, TelemetryStateUpdate } from "../../telemetry/types.js";

export class RovAttitude extends HTMLElement {
  private unsubscribe: (() => void) | undefined;
  private horizon: SVGGElement | undefined;
  private rollValue: HTMLOutputElement | undefined;
  private pitchValue: HTMLOutputElement | undefined;
  connectedCallback(): void {
    this.classList.add("rov-attitude"); this.setAttribute("role", "img"); this.setAttribute("aria-label", "ROV pitch and roll attitude");
    this.innerHTML = `<svg class="rov-attitude__svg" viewBox="0 0 240 240" aria-hidden="true"><defs><clipPath id="rov-attitude-clip"><circle cx="120" cy="120" r="91" /></clipPath></defs><circle class="rov-attitude__bezel" cx="120" cy="120" r="108" /><g clip-path="url(#rov-attitude-clip)"><g class="rov-attitude__horizon"><rect class="rov-attitude__sky" x="0" y="0" width="240" height="120" /><rect class="rov-attitude__water" x="0" y="120" width="240" height="120" /><line class="rov-attitude__horizon-line" x1="0" y1="120" x2="240" y2="120" /><path class="rov-attitude__marks" d="M65 90h35 M75 105h25 M65 150h35 M75 135h25 M175 90h-35 M165 105h-25 M175 150h-35 M165 135h-25" /></g></g><path class="rov-attitude__aircraft" d="M120 92v34 M94 116h52 M106 116l14 10 14-10" /><circle class="rov-attitude__centre" cx="120" cy="120" r="3" /><path class="rov-attitude__reference" d="M120 10v10 M120 220v10" /></svg><div class="rov-attitude__readouts"><output class="rov-attitude__roll">r: --</output><output class="rov-attitude__pitch">p: --</output></div>`;
    this.horizon = this.querySelector(".rov-attitude__horizon") as SVGGElement; this.rollValue = this.querySelector(".rov-attitude__roll") as HTMLOutputElement; this.pitchValue = this.querySelector(".rov-attitude__pitch") as HTMLOutputElement;
    const store = window.rovCockpitTelemetry; if (store) this.unsubscribe = store.subscribe((update) => this.consume(update));
  }
  disconnectedCallback(): void { this.unsubscribe?.(); this.unsubscribe = undefined; }
  private consume(update: TelemetryStateUpdate): void { const pitch = update.state.numeric.get(TOPICS.pitch); const roll = update.state.numeric.get(TOPICS.roll); const p = this.valid(pitch) ? pitch.value : null; const r = this.valid(roll) ? roll.value : null; if (this.horizon) this.horizon.setAttribute("transform", `rotate(${r ?? 0} 120 120) translate(0 ${p === null ? 0 : p * 0.7})`); if (this.rollValue) this.rollValue.textContent = r === null ? "r: --" : `r: ${r.toFixed(2)}`; if (this.pitchValue) this.pitchValue.textContent = p === null ? "p: --" : `p: ${p.toFixed(2)}`; this.dataset.status = p === null || r === null ? "unavailable" : "available"; }
  private valid(reading: NumericTelemetry | undefined): reading is NumericTelemetry & { value: number } { return Boolean(reading?.valid && reading.value !== null && Number.isFinite(reading.value)); }
}
customElements.get("rov-attitude") || customElements.define("rov-attitude", RovAttitude);
