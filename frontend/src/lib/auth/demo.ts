import type { Role } from "./types";

export type DemoAccount = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  patientId: string | null;
  deviceId: string | null;
};

/** Patient record and device the demo patient account is linked to. */
export const DEMO_PATIENT_ID = "P-0042";
export const DEMO_DEVICE_ID = "ESP32-01";

export const demoAccounts: Record<Role, DemoAccount> = {
  clinician: {
    id: "demo-clinician",
    name: "Dr. Amina Rahman",
    email: "clinician@demo.qalb",
    password: "demo-clinician-2025",
    role: "clinician",
    patientId: null,
    deviceId: null,
  },
  patient: {
    id: "demo-patient",
    name: "Demo Patient",
    email: "patient@demo.qalb",
    password: "demo-patient-2025",
    role: "patient",
    patientId: DEMO_PATIENT_ID,
    deviceId: DEMO_DEVICE_ID,
  },
};

export const demoAccountList: DemoAccount[] = [
  demoAccounts.clinician,
  demoAccounts.patient,
];
