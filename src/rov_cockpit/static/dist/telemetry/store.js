import { TOPICS } from "./topics.js";
function asTelemetryValue(value) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    return null;
}
function numeric(raw, updatedAt) {
    if (raw === null || raw.trim() === "")
        return { raw, value: null, valid: false, updatedAt };
    const value = Number(raw);
    return { raw, value: Number.isFinite(value) ? value : null, valid: Number.isFinite(value), updatedAt };
}
export class TelemetryStore {
    values = new Map();
    numericValues = new Map();
    listeners = new Set();
    connected = false;
    lastMessageAt = null;
    subscribe(listener) {
        this.listeners.add(listener);
        listener({ state: this.snapshot(), topic: null });
        return () => this.listeners.delete(listener);
    }
    setConnection(connected) {
        this.connected = connected;
        this.emit(null);
    }
    accept(message) {
        if (typeof message.topic !== "string" || message.topic.trim() === "")
            return;
        const value = asTelemetryValue(message.value);
        const now = Date.now();
        if (value === null)
            return;
        this.values.set(message.topic, value);
        this.numericValues.set(message.topic, numeric(value, now));
        this.lastMessageAt = now;
        this.emit(message.topic);
    }
    snapshot() {
        return {
            connected: this.connected,
            lastMessageAt: this.lastMessageAt,
            depth: this.numericValues.get(TOPICS.depth) ?? { raw: null, value: null, valid: false, updatedAt: null },
            values: new Map(this.values),
            numeric: new Map(this.numericValues)
        };
    }
    emit(topic) {
        const update = { state: this.snapshot(), topic };
        for (const listener of this.listeners)
            listener(update);
    }
}
//# sourceMappingURL=store.js.map