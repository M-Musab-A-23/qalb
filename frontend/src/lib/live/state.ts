import { BEAT_CLASSES, type BeatClass } from "@/lib/analysis/types";
import type { Status } from "@/lib/status";
import type { LiveAlert, LiveEvent } from "./types";

/** What the monitor knows about one stream, built from its events. */
export type MonitorState = {
  heartRate: number | null;
  rhythm: string | null;
  /** Signal quality, 0 to 1. */
  quality: number | null;
  /** Stream time of the newest event, in seconds. */
  now: number;
  /** Position in the replayed record, in seconds. */
  recordT: number;
  loop: number;
  /** Beats seen since the stream started, by class. */
  counts: Record<BeatClass, number>;
  /** Beats that came with an annotated label, and how many of those matched. */
  compared: number;
  agreed: number;
  /** Newest first. */
  alerts: LiveAlert[];
  warnings: string[];
};

export const MAX_ALERTS_KEPT = 30;
/** How long, in stream seconds, an alert keeps a patient out of the normal status. */
export const STATUS_HORIZON_S = 30;

export function emptyCounts(): Record<BeatClass, number> {
  return Object.fromEntries(BEAT_CLASSES.map((c) => [c, 0])) as Record<BeatClass, number>;
}

export function initialMonitorState(): MonitorState {
  return {
    heartRate: null,
    rhythm: null,
    quality: null,
    now: 0,
    recordT: 0,
    loop: 0,
    counts: emptyCounts(),
    compared: 0,
    agreed: 0,
    alerts: [],
    warnings: [],
  };
}

/** Applies one event. Sample blocks only move the clock; they never change the cards. */
export function reduceMonitor(state: MonitorState, event: LiveEvent): MonitorState {
  switch (event.type) {
    case "samples":
      return { ...state, now: Math.max(state.now, event.t), recordT: event.recordT };
    case "beats": {
      const counts = { ...state.counts };
      let compared = state.compared;
      let agreed = state.agreed;
      for (const beat of event.beats) {
        counts[beat.cls] += 1;
        if (beat.groundTruth) {
          compared += 1;
          if (beat.groundTruth === beat.cls) agreed += 1;
        }
      }
      return { ...state, counts, compared, agreed };
    }
    case "alert": {
      if (state.alerts.some((a) => a.id === event.id)) return state;
      return {
        ...state,
        alerts: [event, ...state.alerts].slice(0, MAX_ALERTS_KEPT),
      };
    }
    case "status": {
      if (event.state === "started") {
        return { ...initialMonitorState(), now: event.t, recordT: event.recordT };
      }
      return {
        ...state,
        now: Math.max(state.now, event.t),
        recordT: event.recordT,
        loop: event.loop,
        // Keep the last good value when a window had too few beats to give one.
        heartRate: event.heartRate ?? state.heartRate,
        rhythm: event.rhythm ?? state.rhythm,
        quality: event.quality ?? state.quality,
        warnings: event.warnings,
      };
    }
  }
}

/**
 * The patient-list status: critical while a high-severity alert is recent,
 * warning for a medium alert or an irregular rhythm, otherwise normal.
 */
export function deriveStatus(state: MonitorState): Status {
  const recent = state.alerts.filter((a) => state.now - a.t <= STATUS_HORIZON_S);
  if (recent.some((a) => a.severity === "high")) return "critical";
  if (recent.some((a) => a.severity === "medium") || state.rhythm === "irregular") {
    return "warning";
  }
  return "normal";
}

export function rhythmLabel(rhythm: string | null): string {
  switch (rhythm) {
    case "regular":
      return "Regular rhythm";
    case "irregular":
      return "Irregular rhythm";
    case "insufficient data":
    case null:
      return "Collecting data";
    default:
      return rhythm;
  }
}

/** Plain wording for a 0 to 1 signal quality score. */
export function qualityLabel(quality: number | null): "Good" | "Fair" | "Poor" | "Unknown" {
  if (quality === null) return "Unknown";
  if (quality >= 0.7) return "Good";
  if (quality >= 0.4) return "Fair";
  return "Poor";
}
