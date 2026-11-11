import type { LiveSpeed } from "./types";

/**
 * Which replay record stands in for which device and patient. This is the one
 * place the demo data is tied to MIT-BIH records. A real backend replaces it
 * with the actual device-to-patient pairing and the live stream of each
 * device; no page reads these records directly.
 *
 * Only records from the held-out test patients are used.
 */
export type ReplayAssignment = {
  patientId: string;
  deviceId: string;
  /** MIT-BIH record the ML service replays for this device. */
  record: string;
  /** Where in the record the replay starts, in seconds. */
  offsetSeconds: number;
};

export const replayAssignments: ReplayAssignment[] = [
  { patientId: "P-0042", deviceId: "ESP32-01", record: "233", offsetSeconds: 120 },
  { patientId: "P-0017", deviceId: "ESP32-02", record: "200", offsetSeconds: 0 },
  { patientId: "P-0023", deviceId: "ESP32-03", record: "123", offsetSeconds: 0 },
  { patientId: "P-0031", deviceId: "ESP32-04", record: "100", offsetSeconds: 0 },
  { patientId: "P-0058", deviceId: "ESP32-05", record: "221", offsetSeconds: 0 },
  { patientId: "P-0064", deviceId: "ESP32-06", record: "105", offsetSeconds: 0 },
];

export type ReplayRecordInfo = { record: string; label: string };

/**
 * Labels for the record picker. The ML service sends the same list from
 * `GET /live/records`; this copy is what the picker shows when it is down.
 */
export const replayRecords: ReplayRecordInfo[] = [
  { record: "100", label: "Normal sinus rhythm, rare atrial premature beats" },
  { record: "123", label: "Normal sinus rhythm, rare ventricular beats" },
  { record: "105", label: "Noisy signal with occasional ventricular beats" },
  { record: "200", label: "Frequent ventricular beats, bigeminy and runs" },
  { record: "221", label: "Irregular rhythm with ventricular beats" },
  { record: "233", label: "Frequent ventricular beats and couplets" },
];

export const DEFAULT_SPEED: LiveSpeed = 1;

export function assignmentForPatient(
  patientId: string | null | undefined,
): ReplayAssignment | null {
  return replayAssignments.find((a) => a.patientId === patientId) ?? null;
}

export function assignmentForDevice(
  deviceId: string | null | undefined,
): ReplayAssignment | null {
  return replayAssignments.find((a) => a.deviceId === deviceId) ?? null;
}

export function recordLabel(record: string): string {
  return replayRecords.find((r) => r.record === record)?.label ?? `Record ${record}`;
}
