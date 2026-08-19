type HudStyle = { text: string; line: string; accent: string; lineWidth: number };
const defaults: HudStyle = { text: "#ffffff", line: "#ffffff", accent: "#ffb000", lineWidth: 2 };

export class InstrumentStyleEditor extends HTMLElement {
  connectedCallback(): void {
    const profile = this.getAttribute("profile") || "rov";
    const key = `rov.instrument-style.${profile}.${this.getAttribute("target") || "instrument"}`;
    let style: HudStyle = { ...defaults };
    try { style = { ...style, ...JSON.parse(localStorage.getItem(key) || "{}")} ; } catch { /* use defaults */ }
    this.innerHTML = `<button class="instrument-style-editor__toggle" type="button" aria-expanded="false"><i class="fa-solid fa-sliders" aria-hidden="true"></i><span>HUD style</span></button><form class="instrument-style-editor__popover" hidden><h2>HUD appearance</h2><label>Text colour<input name="text" type="color" value="${style.text}"></label><label>Line colour<input name="line" type="color" value="${style.line}"></label><label>Accent colour<input name="accent" type="color" value="${style.accent}"></label><label>Line thickness<output data-width>${style.lineWidth}px</output><input name="lineWidth" type="range" min="1" max="6" step="1" value="${style.lineWidth}"></label><div class="instrument-style-editor__actions"><button type="button" data-reset>Reset</button><button type="submit">Save</button></div></form>`;
    const toggle = this.querySelector<HTMLButtonElement>(".instrument-style-editor__toggle")!;
    const popover = this.querySelector<HTMLFormElement>(".instrument-style-editor__popover")!;
    const emit = (next: HudStyle) => { localStorage.setItem(key, JSON.stringify(next)); document.dispatchEvent(new CustomEvent("rov-instrument-style", { detail: { target: this.getAttribute("target"), style: next } })); };
    const read = (): HudStyle => ({ text: this.querySelector<HTMLInputElement>("[name=text]")!.value, line: this.querySelector<HTMLInputElement>("[name=line]")!.value, accent: this.querySelector<HTMLInputElement>("[name=accent]")!.value, lineWidth: Number(this.querySelector<HTMLInputElement>("[name=lineWidth]")!.value) });
    toggle.onclick = () => { const open = popover.hidden; popover.hidden = !open; toggle.setAttribute("aria-expanded", String(open)); };
    this.querySelector<HTMLInputElement>("[name=lineWidth]")!.oninput = (event) => { this.querySelector("[data-width]")!.textContent = `${(event.target as HTMLInputElement).value}px`; };
    popover.onsubmit = (event) => { event.preventDefault(); emit(read()); };
    this.querySelector("[data-reset]")!.addEventListener("click", () => { Object.entries(defaults).forEach(([name, value]) => { const input = this.querySelector<HTMLInputElement>(`[name=${name}]`); if (input) input.value = String(value); }); this.querySelector("[data-width]")!.textContent = `${defaults.lineWidth}px`; emit(defaults); });
    emit(style);
  }
}
customElements.get("rov-instrument-style-editor") || customElements.define("rov-instrument-style-editor", InstrumentStyleEditor);
