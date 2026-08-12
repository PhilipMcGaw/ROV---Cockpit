import { TelemetryStore } from "../telemetry/store.js";
export class TelemetryWebSocket {
    store;
    socket = null;
    reconnectTimer;
    reconnectDelay;
    stopped = false;
    maxReconnectDelay;
    constructor(store, options = {}) {
        this.store = store;
        this.reconnectDelay = options.reconnectDelayMs ?? 1000;
        this.maxReconnectDelay = options.maxReconnectDelayMs ?? 10000;
    }
    start() {
        this.stopped = false;
        this.connect();
    }
    stop() {
        this.stopped = true;
        if (this.reconnectTimer !== undefined)
            window.clearTimeout(this.reconnectTimer);
        this.socket?.close();
        this.socket = null;
        this.store.setConnection(false);
    }
    connect() {
        if (this.stopped)
            return;
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const socket = new WebSocket(`${protocol}//${window.location.host}/ws/telemetry`);
        this.socket = socket;
        socket.onopen = () => {
            this.reconnectDelay = 1000;
            this.store.setConnection(true);
        };
        socket.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);
                if (!parsed || typeof parsed !== "object")
                    return;
                const message = parsed;
                if (typeof message.topic !== "string" || !("value" in message))
                    return;
                this.store.accept({ topic: message.topic, value: message.value });
            }
            catch {
                // Invalid WebSocket messages are ignored; the connection remains usable.
            }
        };
        socket.onerror = () => socket.close();
        socket.onclose = () => {
            this.store.setConnection(false);
            if (this.stopped)
                return;
            const delay = this.reconnectDelay;
            this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
            this.reconnectTimer = window.setTimeout(() => this.connect(), delay);
        };
    }
}
//# sourceMappingURL=telemetry-websocket.js.map