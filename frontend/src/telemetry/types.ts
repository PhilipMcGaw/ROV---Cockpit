export type TelemetryValue = string;

export type TelemetryTopic =
  | "system/uptime"
  | "system/time"
  | "system/date"
  | "system/network/status"
  | "input/analog/battery/voltage"
  | "input/analog/battery/percentage"
  | "sensor/water/temperature"
  | "sensor/water/depth"
  | "sensor/water/salinity"
  | "sensor/ahrs/imu/heading"
  | "sensor/ahrs/imu/pitch"
  | "sensor/ahrs/imu/roll"
  | "sensor/ahrs/gps/location/lat"
  | "sensor/ahrs/gps/location/lng"
  | "sensor/ahrs/gps/location/altitude"
  | "sensor/camera/main/pitch"
  | (string & {});

export interface TelemetryMessage {
  topic: string;
  value: unknown;
}

export interface NumericTelemetry {
  raw: TelemetryValue | null;
  value: number | null;
  valid: boolean;
  updatedAt: number | null;
}

export interface CockpitState {
  connected: boolean;
  lastMessageAt: number | null;
  depth: NumericTelemetry;
  values: ReadonlyMap<string, TelemetryValue>;
  numeric: ReadonlyMap<string, NumericTelemetry>;
}

export interface TelemetryStateUpdate {
  state: CockpitState;
  topic: string | null;
}

export type TelemetryListener = (update: TelemetryStateUpdate) => void;
