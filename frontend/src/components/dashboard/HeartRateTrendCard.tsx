import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";
import { getHeartRateTrend } from "@/lib/data";

const axis = ["00:00", "06:00", "12:00", "18:00", "Now"];

const WIDTH = 700;
const HEIGHT = 180;
const MIN_BPM = 50;
const MAX_BPM = 110;

function buildPath(): string {
  const points = getHeartRateTrend();
  const coords = points.map((point, index) => {
    const x = (index / (points.length - 1)) * WIDTH;
    const y = HEIGHT - ((point.bpm - MIN_BPM) / (MAX_BPM - MIN_BPM)) * HEIGHT;
    return [x, y] as const;
  });
  return coords
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
}

export function HeartRateTrendCard({ className }: { className?: string }) {
  return (
    <GlassCard lift className={cn("flex flex-col gap-3 overflow-hidden", className)}>
      <h2 className="text-xl leading-7 font-semibold whitespace-nowrap text-[var(--color-text-primary)]">
        Heart rate, last 24 hours
      </h2>
      <div className="glass-strong h-[180px] overflow-hidden rounded-[var(--radius-md)]">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Heart rate over the last 24 hours"
          className="block size-full"
        >
          {[0.25, 0.5, 0.75].map((fraction) => (
            <line
              key={fraction}
              x1={0}
              x2={WIDTH}
              y1={HEIGHT * fraction}
              y2={HEIGHT * fraction}
              stroke="var(--color-glass-stroke)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path
            d={buildPath()}
            fill="none"
            stroke="var(--color-brand-text)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div className="flex justify-between font-mono text-[13px] leading-4 font-medium text-[var(--color-text-secondary)]">
        {axis.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </GlassCard>
  );
}
