import { BEAT_CLASSES, type BeatClass } from "@/lib/analysis/types";
import type {
  LiveAlert,
  LiveAlertSeverity,
  LiveBeat,
  LiveEvent,
} from "./types";

type Raw = Record<string, unknown>;

const SEVERITIES: readonly string[] = ["high", "medium", "low"];
const STATES: readonly string[] = ["started", "streaming", "loop"];

function isRecord(value: unknown): value is Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function beatClass(value: unknown): BeatClass | null {
  return typeof value === "string" &&
    (BEAT_CLASSES as readonly string[]).includes(value)
    ? (value as BeatClass)
    : null;
}

function parseBeat(raw: unknown): LiveBeat | null {
  if (!isRecord(raw)) return null;
  const t = num(raw.t);
  const cls = beatClass(raw.class);
  const confidence = num(raw.confidence);
  if (t === null || cls === null || confidence === null) return null;
  const beat: LiveBeat = {
    t,
    recordT: num(raw.record_t) ?? t,
    cls,
    confidence,
  };
  if ("ground_truth" in raw) beat.groundTruth = beatClass(raw.ground_truth);
  return beat;
}

function parseAlert(raw: Raw): LiveAlert | null {
  const id = str(raw.id);
  const alertType = str(raw.alert_type);
  const message = str(raw.message);
  const severity = str(raw.severity);
  const t = num(raw.t);
  if (!id || !alertType || message === null || t === null) return null;
  if (!severity || !SEVERITIES.includes(severity)) return null;
  return {
    type: "alert",
    id,
    alertType,
    severity: severity as LiveAlertSeverity,
    confidence: num(raw.confidence) ?? 0,
    message,
    t,
    endT: num(raw.end_t) ?? t,
    recordT: num(raw.record_t) ?? t,
  };
}

/**
 * Turns one decoded JSON message into a typed event. Anything malformed or of
 * an unknown type gives null, so a bad message is skipped instead of breaking
 * the stream.
 */
export function parseLiveEvent(raw: unknown): LiveEvent | null {
  if (!isRecord(raw)) return null;
  switch (raw.type) {
    case "samples": {
      const t = num(raw.t);
      const fs = num(raw.fs);
      if (t === null || fs === null || fs <= 0 || !Array.isArray(raw.values)) {
        return null;
      }
      if (!raw.values.every((v) => typeof v === "number" && Number.isFinite(v))) {
        return null;
      }
      return {
        type: "samples",
        seq: num(raw.seq) ?? 0,
        t,
        recordT: num(raw.record_t) ?? t,
        fs,
        values: raw.values as number[],
      };
    }
    case "beats": {
      if (!Array.isArray(raw.beats)) return null;
      const beats = raw.beats
        .map(parseBeat)
        .filter((b): b is LiveBeat => b !== null);
      return { type: "beats", beats };
    }
    case "alert":
      return parseAlert(raw);
    case "status": {
      const state = str(raw.state);
      const record = str(raw.record);
      const t = num(raw.t);
      if (!state || !STATES.includes(state) || record === null || t === null) {
        return null;
      }
      return {
        type: "status",
        state: state as "started" | "streaming" | "loop",
        record,
        speed: num(raw.speed) ?? 1,
        t,
        recordT: num(raw.record_t) ?? t,
        loop: num(raw.loop) ?? 0,
        heartRate: num(raw.hr_bpm),
        rhythm: str(raw.rhythm),
        quality: num(raw.quality),
        nBeats: num(raw.n_beats),
        warnings: Array.isArray(raw.warnings)
          ? raw.warnings.filter((w): w is string => typeof w === "string")
          : [],
      };
    }
    default:
      return null;
  }
}

/** Parses the JSON text of one message; invalid JSON gives null. */
export function parseLiveMessage(text: string): LiveEvent | null {
  try {
    return parseLiveEvent(JSON.parse(text));
  } catch {
    return null;
  }
}
