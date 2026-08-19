import { TelemetryStore } from "./telemetry/store.js";
import { TelemetryWebSocket } from "./transport/telemetry-websocket.js";
import "./components/instruments/rov-hud.js";
import "./components/instrument-style-editor.js";
import { mountVueStatusInstrument, RovBatteryVue } from "./vue/status-instruments.js";

export const cockpitTelemetryStore = new TelemetryStore();
export const cockpitTelemetrySocket = new TelemetryWebSocket(cockpitTelemetryStore);

declare global {
  interface Window {
    rovCockpitTelemetry?: TelemetryStore;
  }
}

// Publish the store before Vue instruments mount so they can subscribe during setup.
window.rovCockpitTelemetry = cockpitTelemetryStore;

// This layer is intentionally passive during the incremental migration. Existing
// inline instruments continue to use their current router until they are migrated.
const mountVueInstruments = (): void => {
  const battery = document.querySelector("[data-vue-instrument='battery']");
  if (battery) mountVueStatusInstrument(battery, RovBatteryVue);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => { cockpitTelemetrySocket.start(); mountVueInstruments(); }, { once: true });
} else {
  cockpitTelemetrySocket.start();
  mountVueInstruments();
}

