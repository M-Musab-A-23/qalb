import { describe, expect, it } from "vitest";
import { demoAccounts } from "@/lib/auth/demo";
import type { User } from "@/lib/auth";
import { mockAlerts, mockDevices, mockPatients } from "@/lib/mock";
import { scopeAlerts, scopeDevices, scopePatients } from "./scope";

function userFor(role: "clinician" | "patient", extra: Partial<User> = {}): User {
  const account = demoAccounts[role];
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role,
    demo: true,
    patientId: account.patientId,
    deviceId: account.deviceId,
    createdAt: "2025-01-01T00:00:00.000Z",
    ...extra,
  };
}

describe("data scoping", () => {
  it("gives a clinician every patient, device and alert", () => {
    const clinician = userFor("clinician");
    expect(scopePatients(clinician, mockPatients)).toHaveLength(mockPatients.length);
    expect(scopeDevices(clinician, mockDevices)).toHaveLength(mockDevices.length);
    expect(scopeAlerts(clinician, mockAlerts)).toHaveLength(mockAlerts.length);
  });

  it("gives the demo patient only their own device and alerts", () => {
    const patient = userFor("patient");
    expect(scopeDevices(patient, mockDevices).map((d) => d.id)).toEqual([patient.deviceId]);
    const alerts = scopeAlerts(patient, mockAlerts);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.every((alert) => alert.patientId === patient.patientId)).toBe(true);
  });

  it("gives a newly registered patient nothing", () => {
    const fresh = userFor("patient", { demo: false, patientId: null, deviceId: null });
    expect(scopePatients(fresh, mockPatients)).toEqual([]);
    expect(scopeDevices(fresh, mockDevices)).toEqual([]);
    expect(scopeAlerts(fresh, mockAlerts)).toEqual([]);
  });
});
