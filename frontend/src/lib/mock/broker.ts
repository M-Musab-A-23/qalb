import { mockDevices } from "./devices";
import type { BrokerStatus } from "./types";

export const mockBrokerStatus: BrokerStatus = {
  online: true,
  connectedClients: mockDevices.filter((device) => device.connected).length,
  totalClients: mockDevices.length,
  qos: 1,
  transport: "TLS",
};
