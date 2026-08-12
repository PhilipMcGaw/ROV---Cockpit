import type { TelemetryStateUpdate } from "../../telemetry/types.js";

export function formatDepth(reading: TelemetryStateUpdate["state"]["depth"]): string | null {
  if (!reading.valid || reading.value === null) return null;
  const metres = reading.value / 10;
  return Number.isFinite(metres) ? `-${metres} m` : null;
}

export class RovDepth extends HTMLElement {
  private unsubscribe: (() => void) | undefined;
  private valueElement: HTMLSpanElement | undefined;

  connectedCallback(): void {
    this.setAttribute("role", "status");
    this.setAttribute("aria-live", "polite");
    this.setAttribute("aria-label", "ROV depth");
    this.classList.add("rov-depth");

    const icon = document.createElement("i");
    icon.className = "fa-solid fa-gauge rov-depth__icon";
    icon.setAttribute("aria-hidden", "true");
    this.valueElement = document.createElement("output");
    this.valueElement.className = "rov-depth__value";
    this.append(icon, this.valueElement);
    this.renderUnavailable();

    const store = window.rovCockpitTelemetry;
    if (store) {
      this.unsubscribe = store.subscribe((update) => this.consume(update));
    }
  }

  disconnectedCallback(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  private consume(update: TelemetryStateUpdate): void {
    const value = formatDepth(update.state.depth);
    value === null ? this.renderUnavailable() : this.renderValue(value);
  }

  private renderValue(value: string): void {
    if (!this.valueElement) return;
    this.valueElement.textContent = value;
    this.classList.remove("rov-depth--unavailable");
    this.classList.add("rov-depth--available");
    this.removeAttribute("data-status");
  }

  private renderUnavailable(): void {
    if (!this.valueElement) return;
    this.valueElement.textContent = "Depth unavailable";
    this.classList.remove("rov-depth--available");
    this.classList.add("rov-depth--unavailable");
    this.setAttribute("data-status", "unavailable");
  }
}

if (!customElements.get("rov-depth")) {
  customElements.define("rov-depth", RovDepth);
}
