import type {
  CockpitState,
  NumericTelemetry,
  TelemetryListener,
  TelemetryMessage,
  TelemetryStateUpdate,
  TelemetryValue
} from "./types.js";
import { TOPICS } from "./topics.js";

function asTelemetryValue(value: unknown): TelemetryValue | null {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function numeric(raw: TelemetryValue | null, updatedAt: number | null): NumericTelemetry {
  if (raw === null || raw.trim() === "") return { raw, value: null, valid: false, updatedAt };
  const value = Number(raw);
  return { raw, value: Number.isFinite(value) ? value : null, valid: Number.isFinite(value), updatedAt };
}

export class TelemetryStore {
  private readonly values = new Map<string, TelemetryValue>();
  private readonly numericValues = new Map<string, NumericTelemetry>();
  private readonly listeners = new Set<TelemetryListener>();
  private connected = false;
  private lastMessageAt: number | null = null;

  subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    listener({ state: this.snapshot(), topic: null });
    return () => this.listeners.delete(listener);
  }

  setConnection(connected: boolean): void {
    this.connected = connected;
    this.emit(null);
  }

  accept(message: TelemetryMessage): void {
    if (typeof message.topic !== "string" || message.topic.trim() === "") return;
    const value = asTelemetryValue(message.value);
    const now = Date.now();
    if (value === null) return;
    this.values.set(message.topic, value);
    this.numericValues.set(message.topic, numeric(value, now));
    this.lastMessageAt = now;
    this.emit(message.topic);
  }

  snapshot(): CockpitState {
    return {
      connected: this.connected,
      lastMessageAt: this.lastMessageAt,
      depth: this.numericValues.get(TOPICS.depth) ?? { raw: null, value: null, valid: false, updatedAt: null },
      values: new Map(this.values),
      numeric: new Map(this.numericValues)
    };
  }

  private emit(topic: string | null): void {
    const update: TelemetryStateUpdate = { state: this.snapshot(), topic };
    for (const listener of this.listeners) listener(update);
  }
}
