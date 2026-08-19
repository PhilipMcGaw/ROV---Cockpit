import { TelemetryStore } from "./telemetry/store.js";
import { TelemetryWebSocket } from "./transport/telemetry-websocket.js";
import "./components/instruments/rov-hud.js?v=5";
import "./components/instrument-style-editor.js";
import { mountVueStatusInstrument, RovBatteryVue, RovVoltageVue } from "./vue/status-instruments.js";
import { RovLiveDockVue, RovTelemetryConnectionVue } from "./vue/live-dock.js";

export const cockpitTelemetryStore = new TelemetryStore();
export const cockpitTelemetrySocket = new TelemetryWebSocket(cockpitTelemetryStore);

declare global {
  interface Window {
    rovCockpitTelemetry?: TelemetryStore;
  }
}

// Publish the store before Vue instruments mount so they can subscribe during setup.
window.rovCockpitTelemetry = cockpitTelemetryStore;
window.dispatchEvent(new Event("rov-telemetry-ready"));

// This layer is intentionally passive during the incremental migration. Existing
// inline instruments continue to use their current router until they are migrated.
const mountVueInstruments = (): void => {
  const battery = document.querySelector("[data-vue-instrument='battery']");
  const voltage = document.querySelector("[data-vue-instrument='voltage']");
  const connection = document.querySelector("[data-vue-instrument='connection']");
  const liveDock = document.querySelector("[data-vue-instrument='live-dock']");
  if (battery) mountVueStatusInstrument(battery, RovBatteryVue);
  if (voltage) mountVueStatusInstrument(voltage, RovVoltageVue);
  if (connection) mountVueStatusInstrument(connection, RovTelemetryConnectionVue);
  if (liveDock) mountVueStatusInstrument(liveDock, RovLiveDockVue);
};

type CockpitSystemStatus = {
  nats_connected: boolean;
  simulation_enabled: boolean;
};

const startOperatorStatus = (): void => {
  const alert = document.querySelector<HTMLElement>("[data-cockpit-alert]");
  if (!alert) return;

  const show = (message: string, state: "normal" | "nats-offline" | "simulation"): void => {
    alert.textContent = message;
    alert.dataset.status = state;
  };
  const refresh = async (): Promise<void> => {
    try {
      const response = await fetch("/api/system/status", { cache: "no-store" });
      if (!response.ok) throw new Error(`Status request failed: ${response.status}`);
      const status = await response.json() as CockpitSystemStatus;
      if (status.simulation_enabled) {
        show("Simulation mode", "simulation");
      } else if (!status.nats_connected) {
        show("NATS offline", "nats-offline");
      } else {
        show("No recent alerts.", "normal");
      }
    } catch {
      show("NATS offline", "nats-offline");
    }
  };

  void refresh();
  window.setInterval(() => { void refresh(); }, 5_000);
  window.addEventListener("cockpit-system-status-changed", () => { void refresh(); });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => { cockpitTelemetrySocket.start(); mountVueInstruments(); startOperatorStatus(); }, { once: true });
} else {
  cockpitTelemetrySocket.start();
  mountVueInstruments();
  startOperatorStatus();
}

