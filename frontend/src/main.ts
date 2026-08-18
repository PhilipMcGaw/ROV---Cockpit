import { TelemetryStore } from "./telemetry/store.js";
import { TelemetryWebSocket } from "./transport/telemetry-websocket.js";
import "./components/instruments/rov-heading.js";
import "./components/instruments/rov-attitude.js";
import "./components/instruments/rov-pitch.js";
import "./components/instruments/rov-camera-pitch.js";
import "./components/instruments/rov-battery.js";
import "./components/instruments/rov-network-status.js";
import "./components/instruments/rov-hud.js";

export const cockpitTelemetryStore = new TelemetryStore();
export const cockpitTelemetrySocket = new TelemetryWebSocket(cockpitTelemetryStore);

// This layer is intentionally passive during the incremental migration. Existing
// inline instruments continue to use their current router until they are migrated.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => cockpitTelemetrySocket.start(), { once: true });
} else {
  cockpitTelemetrySocket.start();
}

declare global {
  interface Window {
    rovCockpitTelemetry?: TelemetryStore;
  }
}

window.rovCockpitTelemetry = cockpitTelemetryStore;
