/** AAMI beat classes used by the model. */
export const BEAT_CLASSES = ["N", "S", "V", "F", "Q"] as const;
export type BeatClass = (typeof BEAT_CLASSES)[number];

export type AlertSeverity = "high" | "medium" | "low";
export type RhythmLabel = "regular" | "irregular" | "insufficient data";

export type Beat = {
  /** Index into the signal that was analysed, at its own sampling rate. */
  sample: number;
  timeS: number;
  cls: BeatClass;
  /** 0 to 1. */
  confidence: number;
};

export type RhythmAlert = {
  type: string;
  severity: AlertSeverity;
  confidence: number;
  startSample: number;
  endSample: number;
  /** Start and end of the alert in seconds. */
  startS: number;
  endS: number;
  message: string;
};

export type RhythmSummary = {
  nBeats: number;
  classCounts: Record<BeatClass, number>;
  /** Null when there were too few beats to estimate it. */
  meanHrBpm: number | null;
  rrMeanS: number | null;
  rrCv: number | null;
  rrJumpFraction: number | null;
  rhythm: RhythmLabel;
};

export type SignalQuality = {
  /** 0 to 1, higher is cleaner. */
  score: number;
  flatlineFraction: number | null;
  noiseRatio: number | null;
  beatAgreement: number | null;
  ratePlausibility: number | null;
};

export type AnalysisResult = {
  schemaVersion: string;
  model: { name: string; version: string };
  samplingRateIn: number;
  samplingRateModel: number;
  durationS: number;
  beats: Beat[];
  rhythm: RhythmSummary;
  alerts: RhythmAlert[];
  quality: SignalQuality;
  warnings: string[];
  disclaimer: string;
  input: { filename: string | null; originalSamplingRate: number | null };
};

/** Shown wherever a result is displayed. */
export const NOT_A_DIAGNOSIS = "This is not a medical device and not a diagnosis.";
