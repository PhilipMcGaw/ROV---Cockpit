import { TelemetryStore } from "./telemetry/store.js";
import { TelemetryWebSocket } from "./transport/telemetry-websocket.js";
import "./components/instruments/rov-battery.js";
import "./components/instruments/rov-network-status.js";
import "./components/instruments/rov-hud.js";
import "./components/instrument-style-editor.js";
export const cockpitTelemetryStore = new TelemetryStore();
export const cockpitTelemetrySocket = new TelemetryWebSocket(cockpitTelemetryStore);
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => cockpitTelemetrySocket.start(), { once: true });
}
else {
    cockpitTelemetrySocket.start();
}
window.rovCockpitTelemetry = cockpitTelemetryStore;
//# sourceMappingURL=main.js.map
