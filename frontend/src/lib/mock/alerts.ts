import type { AlertItem, AlertStats } from "./types";

export const mockAlerts: AlertItem[] = [
  {
    id: "a-1007",
    severity: "critical",
    title: "Arrhythmia detected",
    patientId: "P-0042",
    deviceId: "ESP32-01",
    detail: "Ventricular tachycardia pattern",
    note: "Confirmed by the model with 94% confidence",
    time: "14:32:08",
    acknowledged: false,
  },
  {
    id: "a-1006",
    severity: "warning",
    title: "Irregular rhythm",
    patientId: "P-0017",
    deviceId: "ESP32-02",
    detail: "Premature beats",
    note: "3 premature beats in the last minute",
    time: "14:30:51",
    acknowledged: false,
  },
  {
    id: "a-1004",
    severity: "normal",
    title: "Back to normal rhythm",
    patientId: "P-0042",
    deviceId: "ESP32-01",
    detail: "Sinus rhythm restored",
    note: "Sinus rhythm restored",
    time: "14:21:17",
    acknowledged: true,
  },
  {
    id: "a-1005",
    severity: "warning",
    title: "Irregular rhythm",
    patientId: "P-0058",
    deviceId: "ESP32-05",
    detail: "Premature beats",
    note: "Heart rate 112 BPM, above resting range",
    time: "14:10:05",
    acknowledged: false,
  },
  {
    id: "a-1003",
    severity: "normal",
    title: "Premature beats",
    patientId: "P-0023",
    deviceId: "ESP32-03",
    detail: "Premature beats",
    note: "Acknowledged by Administrator",
    time: "13:58:40",
    acknowledged: true,
  },
  {
    id: "a-1002",
    severity: "normal",
    title: "Back to normal rhythm",
    patientId: "P-0064",
    deviceId: "ESP32-06",
    detail: "Sinus rhythm restored",
    note: "Sinus rhythm restored",
    time: "12:44:19",
    acknowledged: true,
  },
];

/** Acknowledged alerts for the whole day, including ones older than the list. */
export const mockAcknowledgedToday = 5;

export function computeAlertStats(alerts: AlertItem[]): AlertStats {
  return {
    openCritical: alerts.filter(
      (a) => a.severity === "critical" && !a.acknowledged,
    ).length,
    openWarnings: alerts.filter(
      (a) => a.severity === "warning" && !a.acknowledged,
    ).length,
    acknowledgedToday:
      mockAcknowledgedToday -
      mockAlerts.filter((a) => a.acknowledged).length +
      alerts.filter((a) => a.acknowledged).length,
  };
}
