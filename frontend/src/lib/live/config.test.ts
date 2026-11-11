import { describe, expect, it } from "vitest";
import { demoAccounts } from "@/lib/auth";
import { mockDevices, mockPatients } from "@/lib/mock";
import {
  assignmentForDevice,
  assignmentForPatient,
  recordLabel,
  replayAssignments,
  replayRecords,
} from "./config";

// Held-out test patients (DS2) and the paced records the model never saw.
const DS2 = [
  "100", "103", "105", "111", "113", "117", "121", "123", "200", "202", "210",
  "212", "213", "214", "219", "221", "222", "228", "231", "232", "233", "234",
];

describe("replay assignments", () => {
  it("covers every mock patient and device exactly once", () => {
    expect(replayAssignments.map((a) => a.patientId).sort()).toEqual(
      mockPatients.map((p) => p.id).sort(),
    );
    for (const device of mockDevices) {
      expect(assignmentForDevice(device.id)?.patientId).toBe(device.patientId);
    }
  });

  it("gives each patient a different record", () => {
    const records = replayAssignments.map((a) => a.record);
    expect(new Set(records).size).toBe(records.length);
  });

  it("uses only held-out test records the service offers", () => {
    const offered = replayRecords.map((r) => r.record);
    for (const assignment of replayAssignments) {
      expect(DS2).toContain(assignment.record);
      expect(offered).toContain(assignment.record);
    }
  });

  it("agrees with the record named in the mock patient data", () => {
    for (const patient of mockPatients) {
      expect(patient.record).toBe(`MIT-BIH record ${assignmentForPatient(patient.id)?.record}`);
    }
  });

  it("maps the demo patient account to its own device record", () => {
    const patient = demoAccounts.patient;
    expect(assignmentForPatient(patient.patientId)?.deviceId).toBe(patient.deviceId);
    expect(assignmentForDevice(patient.deviceId)?.record).toBeTruthy();
  });

  it("returns null for an unknown patient or device", () => {
    expect(assignmentForPatient("P-9999")).toBeNull();
    expect(assignmentForDevice(null)).toBeNull();
  });

  it("describes records, with a fallback for unknown ones", () => {
    expect(recordLabel("233")).toContain("ventricular");
    expect(recordLabel("999")).toBe("Record 999");
  });
});
