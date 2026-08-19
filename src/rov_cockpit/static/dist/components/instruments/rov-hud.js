import { TOPICS } from "../../telemetry/topics.js";
const valid = (x) => Boolean(x?.valid && x.value !== null && Number.isFinite(x.value));
const wrap180 = (a) => { const v = ((a + 180) % 360 + 360) % 360 - 180; return v === -180 ? 180 : v; };
export class RovHud extends HTMLElement {
    unsubscribe;
    heading = 0;
    connectedCallback() { this.classList.add("rov-hud"); this.setAttribute("role", "img"); this.setAttribute("aria-label", "ROV roll, pitch, depth and heading HUD"); this.innerHTML = `<div class="rov-hud__roll-scale rov-hud__roll-scale--left" data-roll-scale="left"></div><div class="rov-hud__roll-scale rov-hud__roll-scale--right" data-roll-scale="right"></div><div class="rov-hud__attitude"><output class="rov-hud__roll" data-roll>r: --</output><canvas width="420" height="420" aria-hidden="true"></canvas><output class="rov-hud__pitch" data-pitch>p: --</output></div><div class="rov-hud__depth-scale" data-depth-scale></div><div class="rov-hud__heading"><output data-heading>---°</output><div data-heading-scale></div><b></b></div>`; this.renderScales(); this.drawAttitude(null, null); const s = window.rovCockpitTelemetry; if (s)
        this.unsubscribe = s.subscribe(u => this.consume(u)); document.addEventListener("rov-instrument-style", this.applyStyle); }
    disconnectedCallback() { this.unsubscribe?.(); document.removeEventListener("rov-instrument-style", this.applyStyle); }
    applyStyle = (e) => { if (e.detail.target !== "rov-hud")
        return; const s = e.detail.style; this.style.setProperty("--hud-text", s.text); this.style.setProperty("--hud-line", s.line); this.style.setProperty("--hud-accent", s.accent); this.style.setProperty("--hud-line-width", `${s.lineWidth}px`); };
    consume(u) { const n = u.state.numeric, r = n.get(TOPICS.roll), p = n.get(TOPICS.pitch), d = n.get(TOPICS.depth), h = n.get(TOPICS.heading), rv = valid(r) ? r.value : null, pv = valid(p) ? p.value : null; this.set("[data-roll]", rv === null ? "r: --" : `r: ${rv.toFixed(2)}`); this.set("[data-pitch]", pv === null ? "p: --" : `p: ${pv.toFixed(2)}`); this.drawAttitude(rv, pv); if (valid(h)) {
        this.heading = ((h.value % 360) + 360) % 360;
        this.set("[data-heading]", `${this.heading.toFixed(1)}°`);
        this.updateHeadingTape();
    }
    else
        this.set("[data-heading]", "---°"); this.set("[data-depth-scale] [data-value]", valid(d) ? `${d.value.toFixed(1)} m` : "-- m"); this.querySelectorAll("[data-roll-scale]").forEach(x => x.style.setProperty("--scale-rotate", `${rv ?? 0}deg`)); this.querySelector("[data-depth-scale]")?.style.setProperty("--depth-offset", valid(d) ? `${Math.max(-120, Math.min(120, d.value * -12))}px` : "0px"); }
    drawAttitude(roll, pitch) { const canvas = this.querySelector(".rov-hud__attitude canvas"), ctx = canvas?.getContext("2d"); if (!canvas || !ctx)
        return; const w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2, radius = Math.min(w, h) * .34, pitchPx = (pitch ?? 0) * 2; ctx.clearRect(0, 0, w, h); ctx.save(); ctx.translate(cx, cy); ctx.rotate(-((roll ?? 0) * Math.PI) / 180); ctx.translate(0, pitchPx); ctx.strokeStyle = getComputedStyle(this).getPropertyValue("--hud-line") || "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-radius * 1.8, 0); ctx.lineTo(-radius, 0); ctx.moveTo(radius, 0); ctx.lineTo(radius * 1.8, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, radius, Math.PI * .75, Math.PI * 1.25); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, radius, -Math.PI * .25, Math.PI * .25); ctx.stroke(); ctx.restore(); }
    updateHeadingTape() { this.querySelectorAll("[data-angle]").forEach(item => { const relative = wrap180(Number(item.dataset.angle) - this.heading); item.style.transform = `translateX(calc(-50% + ${relative * 4}px))`; item.style.opacity = Math.abs(relative) > 75 ? "0" : "1"; }); }
    renderScales() { const labels = [-30, -10, 0, 10, 30]; for (const side of ["left", "right"])
        this.querySelector(`[data-roll-scale=${side}]`).innerHTML = labels.map(v => `<span class="${v === 0 ? "zero" : "dotted"}"><b>${v}</b><i></i></span>`).join(""); this.querySelector("[data-depth-scale]").innerHTML = `<output data-value>-- m</output>${[-10, -5, 0, 5, 10].map(v => `<span class="${v === 0 ? "zero" : "dotted"}"><b>${v} m</b><i></i></span>`).join("")}`; this.querySelector("[data-heading-scale]").innerHTML = Array.from({ length: 73 }, (_, i) => { const a = i * 5 - 180, c = a % 45 === 0, names = { 0: "N", 45: "NE", 90: "E", 135: "SE", 180: "S", [-135]: "SW", [-90]: "W", [-45]: "NW" }; return `<span data-angle="${a}" class="${c ? "cardinal" : ""}"><i></i>${a % 15 === 0 ? `${a < 0 ? a + 360 : a}°` : ""}</span>`; }).join(""); this.updateHeadingTape(); }
    set(selector, value) { const e = this.querySelector(selector); if (e)
        e.textContent = value; }
}
customElements.get("rov-hud") || customElements.define("rov-hud", RovHud);
//# sourceMappingURL=rov-hud.js.map