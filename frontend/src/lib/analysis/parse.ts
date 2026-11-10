import {
  BEAT_CLASSES,
  type AlertSeverity,
  type AnalysisResult,
  type Beat,
  type BeatClass,
  type RhythmAlert,
  type RhythmLabel,
} from "./types";

export class ResultParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResultParseError";
  }
}

type Json = Record<string, unknown>;

function fail(path: string, expected: string): never {
  throw new ResultParseError(`Unexpected analysis result: ${path} should be ${expected}.`);
}

function asObject(value: unknown, path: string): Json {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(path, "an object");
  }
  return value as Json;
}

function asNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fail(path, "a number");
  }
  return value;
}

/** A metric the service may leave out or send as null. */
function optionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown, path: string): string {
  if (typeof value !== "string") return fail(path, "text");
  return value;
}

function asBeatClass(value: unknown, path: string): BeatClass {
  if (typeof value === "string" && (BEAT_CLASSES as readonly string[]).includes(value)) {
    return value as BeatClass;
  }
  return fail(path, `one of ${BEAT_CLASSES.join(", ")}`);
}

function asSeverity(value: unknown, path: string): AlertSeverity {
  if (value === "high" || value === "medium" || value === "low") return value;
  return fail(path, "high, medium or low");
}

function asRhythmLabel(value: unknown): RhythmLabel {
  if (value === "regular" || value === "irregular") return value;
  return "insufficient data";
}

function asArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) return fail(path, "a list");
  return value;
}

function parseBeat(raw: unknown, index: number): Beat {
  const path = `beats[${index}]`;
  const beat = asObject(raw, path);
  return {
    sample: asNumber(beat.sample, `${path}.sample`),
    timeS: asNumber(beat.time_s, `${path}.time_s`),
    cls: asBeatClass(beat.class, `${path}.class`),
    confidence: asNumber(beat.confidence, `${path}.confidence`),
  };
}

function parseAlert(raw: unknown, index: number, fs: number): RhythmAlert {
  const path = `alerts[${index}]`;
  const alert = asObject(raw, path);
  const startSample = asNumber(alert.start_sample, `${path}.start_sample`);
  const endSample = asNumber(alert.end_sample, `${path}.end_sample`);
  return {
    type: asString(alert.type, `${path}.type`),
    severity: asSeverity(alert.severity, `${path}.severity`),
    confidence: optionalNumber(alert.confidence) ?? 0,
    startSample,
    endSample,
    startS: startSample / fs,
    endS: endSample / fs,
    message: asString(alert.message, `${path}.message`),
  };
}

/**
 * Turns the JSON from the ML service into the app's own result type.
 * Rejects anything the pages could not draw safely, with a readable reason.
 */
export function parseAnalysisResult(json: unknown): AnalysisResult {
  const root = asObject(json, "result");
  const schemaVersion = asString(root.schema_version, "schema_version");
  if (!schemaVersion.startsWith("1.")) {
    throw new ResultParseError(
      `The analysis service returned schema ${schemaVersion}, which this app does not understand.`,
    );
  }

  const samplingRateIn = asNumber(root.sampling_rate_in, "sampling_rate_in");
  if (samplingRateIn <= 0) fail("sampling_rate_in", "greater than zero");

  const rhythm = asObject(root.rhythm, "rhythm");
  const counts = asObject(rhythm.class_counts, "rhythm.class_counts");
  const model = asObject(root.model, "model");
  const quality = asObject(root.quality, "quality");
  const input = root.input === undefined ? {} : asObject(root.input, "input");

  const classCounts = {} as Record<BeatClass, number>;
  for (const cls of BEAT_CLASSES) {
    classCounts[cls] = optionalNumber(counts[cls]) ?? 0;
  }

  return {
    schemaVersion,
    model: {
      name: asString(model.name, "model.name"),
      version: asString(model.version, "model.version"),
    },
    samplingRateIn,
    samplingRateModel: optionalNumber(root.sampling_rate_model) ?? 360,
    durationS: asNumber(root.duration_s, "duration_s"),
    beats: asArray(root.beats, "beats").map(parseBeat),
    rhythm: {
      nBeats: asNumber(rhythm.n_beats, "rhythm.n_beats"),
      classCounts,
      meanHrBpm: optionalNumber(rhythm.mean_hr_bpm),
      rrMeanS: optionalNumber(rhythm.rr_mean_s),
      rrCv: optionalNumber(rhythm.rr_cv),
      rrJumpFraction: optionalNumber(rhythm.rr_jump_fraction),
      rhythm: asRhythmLabel(rhythm.rhythm),
    },
    alerts: asArray(root.alerts, "alerts").map((alert, index) =>
      parseAlert(alert, index, samplingRateIn),
    ),
    quality: {
      score: asNumber(quality.score, "quality.score"),
      flatlineFraction: optionalNumber(quality.flatline_fraction),
      noiseRatio: optionalNumber(quality.noise_ratio),
      beatAgreement: optionalNumber(quality.beat_agreement),
      ratePlausibility: optionalNumber(quality.rate_plausibility),
    },
    warnings: Array.isArray(root.warnings)
      ? root.warnings.filter((item): item is string => typeof item === "string")
      : [],
    disclaimer: typeof root.disclaimer === "string" ? root.disclaimer : "",
    input: {
      filename: typeof input.filename === "string" ? input.filename : null,
      originalSamplingRate: optionalNumber(input.original_sampling_rate),
    },
  };
}
