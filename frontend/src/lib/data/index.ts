// Data access for the whole app. Everything is simulated for now; to use the
// real API, replace the bodies of these functions and keep the signatures.
import type { User } from "@/lib/auth";
import { createBrowserStore } from "@/lib/auth/storage";
import {
  createAnalysisStore,
  type AnalysisStore,
  type NewAnalysis,
  type StoredAnalysis,
} from "./analyses";
import { scopeAlerts, scopeDevices, scopePatients } from "./scope";
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
export { HistoryStorageError } from "./analyses";
export type { NewAnalysis, StoredAnalysis, StoredSignal } from "./analyses";

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

/** Patients the account may see: all for a clinician, only their own for a patient. */
export function getPatientsFor(user: User): Patient[] {
  return scopePatients(user, mockPatients);
}

export function getDevicesFor(user: User): Device[] {
  return scopeDevices(user, mockDevices);
}

export function getAlertsFor(user: User): AlertItem[] {
  return scopeAlerts(user, mockAlerts);
}

// Analysis history. The calls are async so a real API can replace the
// browser storage behind them without changing the pages.
let analysisStore: AnalysisStore | null = null;

function history(): AnalysisStore {
  analysisStore ??= createAnalysisStore(createBrowserStore(localStorage));
  return analysisStore;
}

export async function listAnalyses(userId: string): Promise<StoredAnalysis[]> {
  return history().list(userId);
}

export async function getAnalysis(
  userId: string,
  id: string,
): Promise<StoredAnalysis | null> {
  return history().get(userId, id);
}

export async function saveAnalysis(
  userId: string,
  input: NewAnalysis,
): Promise<StoredAnalysis> {
  return history().save(userId, input);
}

export async function deleteAnalysis(userId: string, id: string): Promise<void> {
  history().remove(userId, id);
}

export async function clearAnalyses(userId: string): Promise<void> {
  history().clear(userId);
}
