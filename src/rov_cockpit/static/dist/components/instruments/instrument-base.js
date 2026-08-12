export class TelemetryInstrument extends HTMLElement {
    valueElement;
    unsubscribe;
    connectedCallback() {
        this.setAttribute("role", "status");
        this.setAttribute("aria-live", "polite");
        this.classList.add("rov-instrument");
        this.renderShell();
        const store = window.rovCockpitTelemetry;
        if (store)
            this.unsubscribe = store.subscribe((update) => this.consume(update));
    }
    disconnectedCallback() { this.unsubscribe?.(); this.unsubscribe = undefined; }
    consume(update) {
        const value = this.format(this.read(update) ?? { raw: null, value: null, valid: false, updatedAt: null });
        if (!this.valueElement)
            return;
        this.valueElement.textContent = value ?? "Unavailable";
        this.classList.toggle("rov-instrument--unavailable", value === null);
        this.classList.toggle("rov-instrument--available", value !== null);
        this.dataset.status = value === null ? "unavailable" : "available";
    }
    shell(icon, label) {
        const iconElement = document.createElement("i");
        iconElement.className = `fa-solid ${icon}`;
        iconElement.setAttribute("aria-hidden", "true");
        const labelElement = document.createElement("span");
        labelElement.className = "rov-instrument__label";
        labelElement.textContent = label;
        this.valueElement = document.createElement("output");
        this.valueElement.className = "rov-instrument__value";
        this.append(iconElement, labelElement, this.valueElement);
    }
}
//# sourceMappingURL=instrument-base.js.map