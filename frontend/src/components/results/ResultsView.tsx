import type { ReactNode } from "react";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatDuration } from "@/lib/analysis/summary";
import type { AnalysisResult } from "@/lib/analysis/types";
import type { StoredSignal } from "@/lib/data";
import { AlertList } from "./AlertList";
import { BeatTimeline } from "./BeatTimeline";
import { BeatsTable } from "./BeatsTable";
import { ClassLegend } from "./ClassLegend";
import { Disclaimer } from "./Disclaimer";
import { EcgPlot } from "./EcgPlot";
import { SummaryCards } from "./SummaryCards";

export type SignalState = StoredSignal | "loading" | null;

type Props = {
  fileName: string;
  result: AnalysisResult;
  /** The trace to draw, still loading, or null when only the beat timeline can be shown. */
  signal: SignalState;
  /** Extra line under the title, such as when the analysis was run. */
  meta?: ReactNode;
  className?: string;
};

function TraceCard({ result, signal }: { result: AnalysisResult; signal: SignalState }) {
  return (
    <GlassCard className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="flex-1 text-xl leading-7 font-semibold text-[var(--color-text-primary)]">
          {signal !== null && signal !== "loading" ? "ECG trace" : "Beat timeline"}
        </h2>
        <ClassLegend />
      </div>
      {signal === "loading" ? (
        <div
          role="status"
          className="glass-strong flex h-[300px] items-center justify-center rounded-[var(--radius-md)] text-sm text-[var(--color-text-secondary)]"
        >
          Loading the trace
        </div>
      ) : signal ? (
        <EcgPlot samples={signal.samples} fs={signal.fs} beats={result.beats} />
      ) : (
        <>
          <BeatTimeline beats={result.beats} durationS={result.durationS} />
          <p className="text-xs leading-4 tracking-[0.2px] text-[var(--color-text-secondary)]">
            The trace is not available for this analysis, so beats are shown on a timeline.
          </p>
        </>
      )}
    </GlassCard>
  );
}

/** The full result of one analysis. Shared by the Analyze and History pages. */
export function ResultsView({ fileName, result, signal, meta, className }: Props) {
  return (
    <section aria-label={`Results for ${fileName}`} className={className ?? "flex flex-col gap-6"}>
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl leading-8 font-semibold tracking-[-0.02em] break-words text-[var(--color-text-primary)]">
          {fileName}
        </h2>
        <p className="text-sm leading-5 text-[var(--color-text-secondary)]">
          {formatDuration(result.durationS)} at {Math.round(result.samplingRateIn)} Hz · model{" "}
          {result.model.name.replace(/_/g, " ")} {result.model.version}
          {meta ? <> · {meta}</> : null}
        </p>
      </div>
      <Disclaimer />
      {result.warnings.map((warning) => (
        <AlertBanner key={warning} severity="warning" title="Check this recording" description={warning} />
      ))}
      <SummaryCards result={result} />
      <TraceCard result={result} signal={signal} />
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
          <AlertList alerts={result.alerts} />
        </div>
        <div className="min-w-0 flex-1">
          <BeatsTable beats={result.beats} />
        </div>
      </div>
    </section>
  );
}
