// Data access for the whole app. Everything is simulated for now; to use the
// real API, replace the bodies of these functions and keep the signatures.
import {
  baselineVitals,
  computeAlertStats,
  createEcgGenerator,
  mockAlerts,
  mockBrokerStatus,
  mockDevices,
  mockHeartRateTrend,
  mockPatients,
  nextVitals,
  type AlertItem,
  type AlertStats,
  type BrokerStatus,
  type Device,
  type EcgGenerator,
  type LiveVitals,
  type Patient,
  type TrendPoint,
} from "@/lib/mock";

export type {
  AlertItem,
  AlertStats,
  BrokerStatus,
  Device,
  EcgGenerator,
  LiveVitals,
  Patient,
  TrendPoint,
};
export { ECG_SAMPLE_RATE } from "@/lib/mock";

export function getPatients(): Patient[] {
  return mockPatients;
}

export function getDevices(): Device[] {
  return mockDevices;
}

export function getAlerts(): AlertItem[] {
  return mockAlerts;
}

export function getAlertStats(alerts: AlertItem[] = mockAlerts): AlertStats {
  return computeAlertStats(alerts);
}

export function getBrokerStatus(): BrokerStatus {
  return mockBrokerStatus;
}

export function getHeartRateTrend(): TrendPoint[] {
  return mockHeartRateTrend;
}

export function getInitialVitals(): LiveVitals {
  return baselineVitals;
}

export function readNextVitals(previous: LiveVitals): LiveVitals {
  return nextVitals(previous);
}

export function createEcgSource(bpm?: number): EcgGenerator {
  return createEcgGenerator(bpm);
}
