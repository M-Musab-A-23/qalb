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
};

export type AlertItem = {
  id: string;
  severity: Status;
  title: string;
  patientId: string;
  detail: string;
  /** Local time of day, HH:MM:SS. */
  time: string;
  acknowledged: boolean;
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
