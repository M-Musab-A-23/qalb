import type { BeatClass } from "@/lib/analysis/types";

/** Replay speeds the ML service accepts. */
export const LIVE_SPEEDS = [1, 2, 5] as const;
export type LiveSpeed = (typeof LIVE_SPEEDS)[number];

export type LiveAlertSeverity = "high" | "medium" | "low";

/** A block of new signal samples. Times are stream seconds since the feed started. */
export type LiveSamples = {
  type: "samples";
  seq: number;
  /** Stream time of the first sample. */
  t: number;
  /** Position in the replayed record, in seconds. */
  recordT: number;
  /** Sampling rate of `values` in Hz. */
  fs: number;
  values: number[];
};

export type LiveBeat = {
  /** Stream time of the R peak. */
  t: number;
  recordT: number;
  cls: BeatClass;
  confidence: number;
  /** The annotated class, shown only so the demo can compare it with the model. */
  groundTruth?: BeatClass | null;
};

export type LiveBeats = { type: "beats"; beats: LiveBeat[] };

export type LiveAlert = {
  type: "alert";
  id: string;
  alertType: string;
  severity: LiveAlertSeverity;
  confidence: number;
  message: string;
  t: number;
  endT: number;
  recordT: number;
};

export type LiveStatus = {
  type: "status";
  state: "started" | "streaming" | "loop";
  record: string;
  speed: number;
  t: number;
  recordT: number;
  loop: number;
  /** Heart rate over the latest window, or null before there is one. */
  heartRate: number | null;
  rhythm: string | null;
  /** Signal quality from 0 to 1. */
  quality: number | null;
  nBeats: number | null;
  warnings: string[];
};

export type LiveEvent = LiveSamples | LiveBeats | LiveAlert | LiveStatus;

/** What a feed should show. A real device feed would ignore `record`, `speed` and `offsetSeconds`. */
export type LiveTarget = {
  record: string;
  speed: LiveSpeed;
  /** Where in the record to start, in seconds. */
  offsetSeconds: number;
  /** False for a status-only feed with no signal samples (the patient list). */
  samples?: boolean;
};

export type FeedKind = "replay" | "mock";

export type ConnectionState =
  | "idle"
  | "connecting"
  | "live"
  | "reconnecting"
  | "unavailable";

export type FeedConnection = {
  state: ConnectionState;
  kind: FeedKind;
  /** Failed attempts since the last good connection. */
  attempt: number;
  /** Plain-language reason when the state is reconnecting or unavailable. */
  message: string | null;
};

export type Unsubscribe = () => void;

/**
 * The only thing a page knows about the data source. The replay and mock
 * implementations live in this folder; a real backend feed implements the
 * same interface and is returned from `createLiveFeed`.
 */
export interface LiveFeed {
  /** Starts (or restarts) the feed for a target. */
  connect(target: LiveTarget): void;
  /** Stops the feed and releases the connection. Safe to call twice. */
  disconnect(): void;
  onSamples(listener: (event: LiveSamples) => void): Unsubscribe;
  onBeats(listener: (event: LiveBeats) => void): Unsubscribe;
  onAlert(listener: (event: LiveAlert) => void): Unsubscribe;
  onStatus(listener: (event: LiveStatus) => void): Unsubscribe;
  onConnection(listener: (connection: FeedConnection) => void): Unsubscribe;
  getConnection(): FeedConnection;
}
