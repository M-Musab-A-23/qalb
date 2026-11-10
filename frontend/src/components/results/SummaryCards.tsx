import {
  formatPercent,
  heartRateSummary,
  qualitySummary,
  rhythmSummary,
} from "@/lib/analysis/summary";
import { BEAT_CLASSES, type AnalysisResult } from "@/lib/analysis/types";
import { ClassBadge } from "./ClassBadge";
import { SummaryTile } from "./SummaryTile";

export function SummaryCards({ result }: { result: AnalysisResult }) {
  const heartRate = heartRateSummary(result.rhythm.meanHrBpm);
  const rhythm = rhythmSummary(result.rhythm.rhythm);
  const quality = qualitySummary(result.quality.score);

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryTile
        label="Heart rate"
        value={result.rhythm.meanHrBpm === null ? "--" : String(Math.round(result.rhythm.meanHrBpm))}
        unit="bpm"
        status={heartRate.status}
        statusLabel={heartRate.label}
      />
      <SummaryTile
        label="Rhythm"
        value={rhythm.value}
        status={rhythm.status}
        statusLabel={rhythm.label}
      />
      <SummaryTile
        label="Signal quality"
        value={formatPercent(result.quality.score)}
        status={quality.status}
        statusLabel={quality.label}
      />
      <SummaryTile label={`Beats · ${result.rhythm.nBeats} total`}>
        <ul className="grid w-full grid-cols-1 gap-1">
          {BEAT_CLASSES.map((cls) => (
            <li key={cls} className="flex items-center justify-between gap-3">
              <ClassBadge cls={cls} showName />
              <span className="font-mono text-sm leading-5 font-medium text-[var(--color-text-primary)] tabular-nums">
                {result.rhythm.classCounts[cls]}
              </span>
            </li>
          ))}
        </ul>
      </SummaryTile>
    </div>
  );
}
