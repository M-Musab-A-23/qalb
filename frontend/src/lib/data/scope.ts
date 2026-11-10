import type { User } from "@/lib/auth";
import type { AlertItem, Device, Patient } from "@/lib/mock";

// What each role may see of the monitoring data. A clinician sees everything;
// a patient sees only the records tied to their own account, which for a
// newly registered account is nothing at all.

export function scopePatients(user: User, patients: Patient[]): Patient[] {
  if (user.role === "clinician") return patients;
  return patients.filter((patient) => patient.id === user.patientId);
}

export function scopeDevices(user: User, devices: Device[]): Device[] {
  if (user.role === "clinician") return devices;
  return devices.filter((device) => device.id === user.deviceId);
}

export function scopeAlerts(user: User, alerts: AlertItem[]): AlertItem[] {
  if (user.role === "clinician") return alerts;
  return alerts.filter((alert) => alert.patientId === user.patientId);
}
