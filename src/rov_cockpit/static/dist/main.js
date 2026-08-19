import { TelemetryStore } from "./telemetry/store.js";
import { TelemetryWebSocket } from "./transport/telemetry-websocket.js";
import "./components/instruments/rov-hud.js?v=5";
import "./components/instrument-style-editor.js";
import { mountVueStatusInstrument, RovBatteryVue, RovVoltageVue } from "./vue/status-instruments.js";
import { RovLiveDockVue, RovTelemetryConnectionVue } from "./vue/live-dock.js";
export const cockpitTelemetryStore = new TelemetryStore();
export const cockpitTelemetrySocket = new TelemetryWebSocket(cockpitTelemetryStore);
// Publish the store before Vue instruments mount so they can subscribe during setup.
window.rovCockpitTelemetry = cockpitTelemetryStore;
window.dispatchEvent(new Event("rov-telemetry-ready"));
// This layer is intentionally passive during the incremental migration. Existing
// inline instruments continue to use their current router until they are migrated.
const mountVueInstruments = () => {
    const battery = document.querySelector("[data-vue-instrument='battery']");
    const voltage = document.querySelector("[data-vue-instrument='voltage']");
    const connection = document.querySelector("[data-vue-instrument='connection']");
    const liveDock = document.querySelector("[data-vue-instrument='live-dock']");
    if (battery)
        mountVueStatusInstrument(battery, RovBatteryVue);
    if (voltage)
        mountVueStatusInstrument(voltage, RovVoltageVue);
    if (connection)
        mountVueStatusInstrument(connection, RovTelemetryConnectionVue);
    if (liveDock)
        mountVueStatusInstrument(liveDock, RovLiveDockVue);
};
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { cockpitTelemetrySocket.start(); mountVueInstruments(); }, { once: true });
}
else {
    cockpitTelemetrySocket.start();
    mountVueInstruments();
}
//# sourceMappingURL=main.js.map