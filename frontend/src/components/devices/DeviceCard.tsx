import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";
import type { Device } from "@/lib/data";
import { formatMessageAge } from "@/lib/format";
import { assignmentForDevice } from "@/lib/live/config";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 leading-4 font-medium">
      <dt className="flex-1 text-xs tracking-[0.2px] text-[var(--color-text-secondary)]">
        {label}
      </dt>
      <dd className="font-mono text-[13px] whitespace-nowrap text-[var(--color-text-primary)]">
        {value}
      </dd>
    </div>
  );
}

export function DeviceCard({ device }: { device: Device }) {
  const replay = assignmentForDevice(device.id);
  return (
    <GlassCard lift className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h2 className="flex-1 text-xl leading-7 font-semibold text-[var(--color-text-primary)]">
          {device.id}
        </h2>
        <span className="glass-strong inline-flex items-center gap-2 rounded-full px-3 py-2 font-mono text-[13px] leading-4 font-medium whitespace-nowrap text-[var(--color-text-primary)]">
          <span
            aria-hidden
            className={cn(
              "size-2 rounded-full",
              device.connected
                ? "bg-[var(--color-status-ok-fg)]"
                : "bg-[var(--color-status-crit-fg)]",
            )}
          />
          {device.connected ? "Connected" : "Offline"}
        </span>
      </div>
      <dl className="flex flex-col gap-4">
        <Row label="Patient" value={device.patientId} />
        <Row label="MQTT topic" value={device.mqttTopic} />
        <Row label="Sample rate" value={`${device.sampleRate} Hz`} />
        {replay ? (
          <Row label="Live replay" value={`MIT-BIH ${replay.record}`} />
        ) : null}
        <Row
          label="Last message"
          value={formatMessageAge(device.lastMessageSeconds)}
        />
      </dl>
    </GlassCard>
  );
}
