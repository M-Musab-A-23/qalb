import { TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { getBrokerStatus, getDevices } from "@/lib/data";
import { BrokerPanel } from "./BrokerPanel";
import { DeviceCard } from "./DeviceCard";

export function DevicesView() {
  const devices = getDevices();

  return (
    <>
      <TopBar
        title="Devices"
        subtitle="Simulated ESP32 nodes publishing ECG over MQTT"
        actions={<Button>Register device</Button>}
      />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {devices.map((device) => (
          <DeviceCard key={device.id} device={device} />
        ))}
      </div>
      <BrokerPanel broker={getBrokerStatus()} />
    </>
  );
}
