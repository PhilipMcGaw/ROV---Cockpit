import type { NumericTelemetry, TelemetryStateUpdate } from "../../telemetry/types.js";

export abstract class TelemetryInstrument extends HTMLElement {
  protected valueElement?: HTMLElement;
  private unsubscribe: (() => void) | undefined;

  connectedCallback(): void {
    this.setAttribute("role", "status");
    this.setAttribute("aria-live", "polite");
    this.classList.add("rov-instrument");
    this.renderShell();
    const store = window.rovCockpitTelemetry;
    if (store) this.unsubscribe = store.subscribe((update) => this.consume(update));
  }

  disconnectedCallback(): void { this.unsubscribe?.(); this.unsubscribe = undefined; }
  protected abstract renderShell(): void;
  protected abstract read(update: TelemetryStateUpdate): NumericTelemetry | null;
  protected abstract format(reading: NumericTelemetry): string | null;

  private consume(update: TelemetryStateUpdate): void {
    const value = this.format(this.read(update) ?? { raw: null, value: null, valid: false, updatedAt: null });
    if (!this.valueElement) return;
    this.valueElement.textContent = value ?? "Unavailable";
    this.classList.toggle("rov-instrument--unavailable", value === null);
    this.classList.toggle("rov-instrument--available", value !== null);
    this.dataset.status = value === null ? "unavailable" : "available";
  }

  protected shell(icon: string, label: string): void {
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
