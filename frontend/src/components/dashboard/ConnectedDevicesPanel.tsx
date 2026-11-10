import { DeviceChip } from "@/components/ui/DeviceChip";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";
import type { Device } from "@/lib/data";

export function ConnectedDevicesPanel({
  devices: all,
  className,
}: {
  devices: Device[];
  className?: string;
}) {
  const devices = [
    ...all.filter((device) => device.connected).slice(0, 2),
    ...all.filter((device) => !device.connected).slice(0, 1),
  ];

  return (
    <GlassCard lift className={cn("flex flex-col items-start gap-3 overflow-hidden", className)}>
      <h2 className="text-xl leading-7 font-semibold whitespace-nowrap text-[var(--color-text-primary)]">
        Connected devices
      </h2>
      {devices.map((device) => (
        <DeviceChip
          key={device.id}
          name={device.id}
          connected={device.connected}
        />
      ))}
      <p className="text-xs leading-4 font-medium tracking-[0.2px] text-[var(--color-text-secondary)]">
        Last message 0.4 s ago. Values are simulated.
      </p>
    </GlassCard>
  );
}
