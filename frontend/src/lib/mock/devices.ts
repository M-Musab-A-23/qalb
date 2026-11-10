import type { Device } from "./types";

export const mockDevices: Device[] = [
  {
    id: "ESP32-01",
    patientId: "P-0042",
    connected: true,
    firmware: "1.4.2",
    signal: -48,
    lastMessageSeconds: 0.4,
  },
  {
    id: "ESP32-02",
    patientId: "P-0017",
    connected: true,
    firmware: "1.4.2",
    signal: -55,
    lastMessageSeconds: 0.6,
  },
  {
    id: "ESP32-03",
    patientId: "P-0023",
    connected: true,
    firmware: "1.4.1",
    signal: -61,
    lastMessageSeconds: 0.5,
  },
  {
    id: "ESP32-04",
    patientId: "P-0031",
    connected: true,
    firmware: "1.4.2",
    signal: -52,
    lastMessageSeconds: 0.3,
  },
  {
    id: "ESP32-05",
    patientId: "P-0058",
    connected: true,
    firmware: "1.4.0",
    signal: -67,
    lastMessageSeconds: 1.1,
  },
  {
    id: "ESP32-06",
    patientId: "P-0064",
    connected: false,
    firmware: "1.3.9",
    signal: -88,
    lastMessageSeconds: 312,
  },
];
