import { TOPICS } from "../../telemetry/topics.js";
function valid(reading) {
    return Boolean(reading?.valid && reading.value !== null && Number.isFinite(reading.value));
}
export class RovHud extends HTMLElement {
    unsubscribe;
    connectedCallback() {
        this.classList.add("rov-hud");
        this.setAttribute("role", "img");
        this.setAttribute("aria-label", "ROV roll, pitch, depth and heading HUD");
        this.innerHTML = `
      <div class="rov-hud__depth rov-hud__depth--left"><span>Depth</span><output data-depth-left>-- m</output><i data-depth-scale></i></div>
      <div class="rov-hud__depth rov-hud__depth--right"><span>Depth</span><output data-depth-right>-- m</output><i data-depth-scale></i></div>
      <div class="rov-hud__attitude"><svg viewBox="0 0 240 240" aria-hidden="true"><defs><clipPath id="rov-hud-clip"><circle cx="120" cy="120" r="91" /></clipPath></defs><circle class="rov-hud__bezel" cx="120" cy="120" r="108" /><g clip-path="url(#rov-hud-clip)"><g data-horizon><rect class="rov-hud__sky" x="0" y="0" width="240" height="120" /><rect class="rov-hud__water" x="0" y="120" width="240" height="120" /><line class="rov-hud__horizon-line" x1="0" y1="120" x2="240" y2="120" /><path class="rov-hud__marks" d="M65 90h35 M75 105h25 M65 150h35 M75 135h25 M175 90h-35 M165 105h-25 M175 150h-35 M165 135h-25" /></g></g><path class="rov-hud__aircraft" d="M120 92v34 M94 116h52 M106 116l14 10 14-10" /><circle class="rov-hud__centre" cx="120" cy="120" r="3" /></svg><output class="rov-hud__roll" data-roll>r: --</output><output class="rov-hud__pitch" data-pitch>p: --</output></div>
      <div class="rov-hud__heading"><output data-heading>---°</output><div data-heading-scale></div><b></b></div>`;
        this.renderScales();
        const store = window.rovCockpitTelemetry;
        if (store)
            this.unsubscribe = store.subscribe((update) => this.consume(update));
        document.addEventListener("rov-instrument-style", this.applyStyle);
    }
    disconnectedCallback() { this.unsubscribe?.(); this.unsubscribe = undefined; document.removeEventListener("rov-instrument-style", this.applyStyle); }
    applyStyle = (event) => { if (event.detail.target !== "rov-hud") return; const s = event.detail.style; this.style.setProperty("--hud-text", s.text); this.style.setProperty("--hud-line", s.line); this.style.setProperty("--hud-accent", s.accent); this.style.setProperty("--hud-line-width", `${s.lineWidth}px`); };
    consume(update) {
        const numeric = update.state.numeric;
        const roll = numeric.get(TOPICS.roll), pitch = numeric.get(TOPICS.pitch), depth = numeric.get(TOPICS.depth), heading = numeric.get(TOPICS.heading);
        const horizon = this.querySelector("[data-horizon]");
        const rollValue = valid(roll) ? roll.value : null, pitchValue = valid(pitch) ? pitch.value : null;
        if (horizon)
            horizon.setAttribute("transform", `rotate(${rollValue ?? 0} 120 120) translate(0 ${pitchValue === null ? 0 : pitchValue * 0.7})`);
        this.setText("[data-roll]", rollValue === null ? "r: --" : `r: ${rollValue.toFixed(2)}°`);
        this.setText("[data-pitch]", pitchValue === null ? "p: --" : `p: ${pitchValue.toFixed(2)}°`);
        this.setText("[data-heading]", valid(heading) ? `${Math.round((heading.value + 360) % 360)}°` : "---°");
        this.setText("[data-depth-left]", valid(depth) ? `${depth.value.toFixed(2)} m` : "-- m");
        this.setText("[data-depth-right]", valid(depth) ? `${depth.value.toFixed(2)} m` : "-- m");
        this.querySelectorAll("[data-depth-scale]").forEach((scale) => scale.style.setProperty("--depth-offset", valid(depth) ? `${Math.max(-90, Math.min(90, depth.value * -18))}px` : "0px"));
        if (valid(heading)) this.querySelector("[data-heading-scale]")?.style.setProperty("--heading-offset", `${-((heading.value + 360) % 360) * 1.4}px`);
        this.dataset.status = rollValue === null || pitchValue === null || !valid(depth) || !valid(heading) ? "partial" : "available";
    }
    setText(selector, value) { const element = this.querySelector(selector); if (element) element.textContent = value; }
    renderScales() {
        this.querySelectorAll("[data-depth-scale]").forEach((scale) => { scale.innerHTML = Array.from({ length: 11 }, (_, i) => `<span>${i - 5} m</span>`).join(""); });
        const scale = this.querySelector("[data-heading-scale]");
        if (scale) scale.innerHTML = Array.from({ length: 25 }, (_, i) => { const degree = (i * 15) % 360; const cardinal = [0, 90, 180, 270].includes(degree); return `<span class="${cardinal ? "cardinal" : ""}">${cardinal ? ["N", "E", "S", "W"][degree / 90] : `${degree}°`}</span>`; }).join("");
    }
}
customElements.get("rov-hud") || customElements.define("rov-hud", RovHud);
