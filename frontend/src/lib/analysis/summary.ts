import type { Status } from "@/lib/status";
import type { AlertSeverity, AnalysisResult, RhythmLabel } from "./types";

export type Labelled = { status: Status; label: string };

/** Resting range of 50 to 100 beats per minute counts as normal. */
export function heartRateSummary(bpm: number | null): Labelled {
  if (bpm === null) return { status: "warning", label: "Not enough beats" };
  if (bpm > 100) return { status: "warning", label: "Fast" };
  if (bpm < 50) return { status: "warning", label: "Slow" };
  return { status: "normal", label: "In range" };
}

export function rhythmSummary(rhythm: RhythmLabel): Labelled & { value: string } {
  if (rhythm === "regular") return { status: "normal", label: "Even spacing", value: "Regular" };
  if (rhythm === "irregular") {
    return { status: "warning", label: "Uneven spacing", value: "Irregular" };
  }
  return { status: "warning", label: "Too few beats", value: "Unknown" };
}

/** Quality score is 0 to 1; the service warns below 0.35. */
export function qualitySummary(score: number): Labelled {
  if (score >= 0.7) return { status: "normal", label: "Good" };
  if (score >= 0.35) return { status: "warning", label: "Fair" };
  return { status: "critical", label: "Poor" };
}

export function severityStatus(severity: AlertSeverity): Status {
  return severity === "high" ? "critical" : "warning";
}

export const severityLabels: Record<AlertSeverity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

/** Seconds as m:ss.s, for example 72.4 becomes "1:12.4". */
export function formatClock(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const rest = safe - minutes * 60;
  return `${minutes}:${rest.toFixed(1).padStart(4, "0")}`;
}

/** Recording length such as "30 s" or "2 min 05 s". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds - minutes * 60);
  return `${minutes} min ${String(rest).padStart(2, "0")} s`;
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** One-line description of the beat mix, used in the history list. */
export function countsLine(result: AnalysisResult): string {
  const { classCounts } = result.rhythm;
  return (["N", "S", "V", "F", "Q"] as const)
    .filter((cls) => classCounts[cls] > 0)
    .map((cls) => `${cls} ${classCounts[cls]}`)
    .join(" · ");
}
