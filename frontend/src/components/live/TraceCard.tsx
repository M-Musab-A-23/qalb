import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";
import type { BeatClass } from "@/lib/analysis/types";
import type { RollingTrace } from "@/lib/live/buffer";
import { LiveTrace } from "./LiveTrace";
import { BeatKey } from "./BeatKey";
import type { ReactNode } from "react";

export const TRACE_WINDOW_SECONDS = 8;

/** The ECG card: trace with beat markers, the class key and a one-line source note. */
export function TraceCard({
  trace,
  speed,
  title,
  badge,
  note,
  counts,
  className,
}: {
  trace: RollingTrace;
  speed: number;
  title: string;
  badge: ReactNode;
  note: string;
  counts: Record<BeatClass, number>;
  className?: string;
}) {
  return (
    <GlassCard lift className={cn("flex min-w-0 flex-col gap-4", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="flex-1 text-xl leading-7 font-semibold text-[var(--color-text-primary)]">
          {title}
        </h2>
        {badge}
      </div>
      <div className="glass-strong min-h-[260px] flex-1 overflow-hidden rounded-[var(--radius-md)]">
        <LiveTrace
          trace={trace}
          speed={speed}
          windowSeconds={TRACE_WINDOW_SECONDS}
          className="block size-full min-h-[260px]"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <BeatKey counts={counts} />
        <p className="text-xs leading-4 font-medium tracking-[0.2px] text-[var(--color-text-secondary)]">
          {note}
        </p>
      </div>
    </GlassCard>
  );
}
