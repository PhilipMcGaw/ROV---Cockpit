import { TOPICS } from "../../telemetry/topics.js";
const valid = (x) => Boolean(x?.valid && x.value !== null && Number.isFinite(x.value));
const wrap180 = (a) => { const v = ((a + 180) % 360 + 360) % 360 - 180; return v === -180 ? 180 : v; };
export class RovHud extends HTMLElement {
    unsubscribe;
    heading = 0;
    connectedCallback() { this.classList.add("rov-hud"); this.setAttribute("role", "img"); this.setAttribute("aria-label", "ROV roll, pitch, depth and heading HUD"); this.innerHTML = `<div class="rov-hud__roll-scale rov-hud__roll-scale--left" data-roll-scale="left"></div><div class="rov-hud__roll-scale rov-hud__roll-scale--right" data-roll-scale="right"></div><div class="rov-hud__attitude"><svg viewBox="0 0 420 420" aria-hidden="true"><path class="rov-hud__arc" d="M125 75 A145 145 0 0 0 125 345 M295 75 A145 145 0 0 1 295 345"/><path class="rov-hud__reference" d="M75 210h75 M270 210h75 M195 190v40"/></svg><output data-roll>r: --</output><output data-pitch>p: --</output></div><div class="rov-hud__depth-scale" data-depth-scale></div><div class="rov-hud__heading"><output data-heading>---°</output><div data-heading-scale></div><b></b></div>`; this.renderScales(); const s = window.rovCockpitTelemetry; if (s)
        this.unsubscribe = s.subscribe(u => this.consume(u)); document.addEventListener("rov-instrument-style", this.applyStyle); }
    disconnectedCallback() { this.unsubscribe?.(); document.removeEventListener("rov-instrument-style", this.applyStyle); }
    applyStyle = (e) => { if (e.detail.target !== "rov-hud")
        return; const s = e.detail.style; this.style.setProperty("--hud-text", s.text); this.style.setProperty("--hud-line", s.line); this.style.setProperty("--hud-accent", s.accent); this.style.setProperty("--hud-line-width", `${s.lineWidth}px`); };
    consume(u) { const n = u.state.numeric, r = n.get(TOPICS.roll), p = n.get(TOPICS.pitch), d = n.get(TOPICS.depth), h = n.get(TOPICS.heading), rv = valid(r) ? r.value : null, pv = valid(p) ? p.value : null; this.set("[data-roll]", rv === null ? "r: --" : `r: ${rv.toFixed(2)}`); this.set("[data-pitch]", pv === null ? "p: --" : `p: ${pv.toFixed(2)}`); if (valid(h)) {
        this.heading = ((h.value % 360) + 360) % 360;
        this.set("[data-heading]", `${this.heading.toFixed(1)}°`);
        this.updateHeadingTape();
    }
    else
        this.set("[data-heading]", "---°"); this.set("[data-depth-scale] [data-value]", valid(d) ? `${d.value.toFixed(1)} m` : "-- m"); this.querySelectorAll("[data-roll-scale]").forEach(x => x.style.setProperty("--scale-rotate", `${rv ?? 0}deg`)); this.querySelector(".rov-hud__attitude")?.style.setProperty("--pitch-offset", `${pv === null ? 0 : pv * 2}px`); this.querySelector("[data-depth-scale]")?.style.setProperty("--depth-offset", valid(d) ? `${Math.max(-120, Math.min(120, d.value * -12))}px` : "0px"); }
    updateHeadingTape() { this.querySelectorAll("[data-angle]").forEach(item => { const relative = wrap180(Number(item.dataset.angle) - this.heading); item.style.transform = `translateX(${relative * 4}px)`; item.style.opacity = Math.abs(relative) > 90 ? "0" : "1"; }); }
    renderScales() { const labels = [-30, -10, 0, 10, 30]; for (const side of ["left", "right"])
        this.querySelector(`[data-roll-scale=${side}]`).innerHTML = labels.map(v => `<span class="${v === 0 ? "zero" : "dotted"}"><b>${v}</b><i></i></span>`).join(""); this.querySelector("[data-depth-scale]").innerHTML = `<output data-value>-- m</output>${[-10, -5, 0, 5, 10].map(v => `<span class="${v === 0 ? "zero" : "dotted"}"><b>${v} m</b><i></i></span>`).join("")}`; this.querySelector("[data-heading-scale]").innerHTML = Array.from({ length: 121 }, (_, i) => { const a = i * 3 - 180, c = a % 45 === 0, names = { 0: "N", 45: "NE", 90: "E", 135: "SE", 180: "S", [-135]: "SW", [-90]: "W", [-45]: "NW" }; return `<span data-angle="${a}" class="${c ? "cardinal" : ""}"><i></i>${c ? names[a] : a % 15 === 0 ? `${a < 0 ? a + 360 : a}°` : ""}</span>`; }).join(""); this.updateHeadingTape(); }
    set(selector, value) { const e = this.querySelector(selector); if (e)
        e.textContent = value; }
}
customElements.get("rov-hud") || customElements.define("rov-hud", RovHud);
//# sourceMappingURL=rov-hud.js.map