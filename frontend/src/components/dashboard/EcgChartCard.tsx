import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";
import { ECG_SAMPLE_RATE } from "@/lib/data";
import { ECG_WINDOW_SECONDS, EcgCanvas } from "./EcgCanvas";

const axis = Array.from(
  { length: ECG_WINDOW_SECONDS + 1 },
  (_, second) => `${second} s`,
);

export function EcgChartCard({
  paused,
  className,
}: {
  paused: boolean;
  className?: string;
}) {
  return (
    <GlassCard lift className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center gap-3">
        <h2 className="flex-1 text-xl leading-7 font-semibold text-[var(--color-text-primary)]">
          ECG · Lead II
        </h2>
        <span className="inline-flex items-center gap-[6px] rounded-full bg-[var(--color-signal-tint)] py-1 pr-3 pl-[10px] font-mono text-[13px] leading-4 font-medium whitespace-nowrap text-[var(--color-signal-line)]">
          <span
            aria-hidden
            className="size-2 rounded-full bg-[var(--color-signal-line)]"
          />
          {paused ? "PAUSED" : "LIVE"} · {ECG_SAMPLE_RATE} Hz
        </span>
      </div>
      <div className="glass-strong min-h-[200px] flex-1 overflow-hidden rounded-[var(--radius-md)]">
        <EcgCanvas paused={paused} className="block size-full min-h-[200px]" />
      </div>
      <div className="flex justify-between font-mono text-[13px] leading-4 font-medium text-[var(--color-text-secondary)]">
        {axis.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </GlassCard>
  );
}
