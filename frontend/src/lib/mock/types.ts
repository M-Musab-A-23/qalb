import type { Status } from "@/lib/status";

export type Patient = {
  id: string;
  /** Simulated source record, for example "MIT-BIH record 100". */
  record: string;
  status: Status;
  heartRate: number;
  deviceId: string;
  /** Time of the last alert, or null when there has been none today. */
  lastAlertTime: string | null;
  lastAlertLabel: string | null;
};

export type Device = {
  id: string;
  patientId: string;
  connected: boolean;
  firmware: string;
  /** Signal strength in dBm. */
  signal: number;
  /** Seconds since the last message was received. */
  lastMessageSeconds: number;
  mqttTopic: string;
  /** Samples per second published by the device. */
  sampleRate: number;
};

export type BrokerStatus = {
  online: boolean;
  connectedClients: number;
  totalClients: number;
  qos: number;
  transport: string;
};

export type AlertStats = {
  openCritical: number;
  openWarnings: number;
  acknowledgedToday: number;
};

/** Where an alert came from. Seeded demo alerts have no source. */
export type AlertSource = "live-replay" | "simulated";

export type AlertItem = {
  id: string;
  severity: Status;
  title: string;
  patientId: string;
  detail: string;
  /** Second line shown in the alerts table. */
  note: string;
  deviceId: string;
  /** Local time of day, HH:MM:SS. */
  time: string;
  acknowledged: boolean;
  /** Set on alerts raised by a live feed during this session. */
  source?: AlertSource;
};

export type TrendPoint = {
  /** Hours before now, from 24 down to 0. */
  hoursAgo: number;
  bpm: number;
};

export type LiveVitals = {
  heartRate: number;
  spo2: number;
  /** Heart rate variability in ms. */
  hrv: number;
  /** R-R interval in ms. */
  rrInterval: number;
};
