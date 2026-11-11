import { createFeedHub, subscriptions } from "./emitter";
import {
  createSyntheticEcg,
  hashString,
  seededRandom,
  type SyntheticProfile,
} from "./synthetic";
import type {
  FeedConnection,
  LiveAlert,
  LiveBeat,
  LiveFeed,
  LiveTarget,
} from "./types";

export const MOCK_FS = 120;
const TICK_S = 0.25;
const ANALYSIS_EVERY = 8;
/** Beats this recent are held back, as the model needs the rest of the beat. */
const DETECTION_DELAY_S = 0.5;
const WINDOW_S = 10;

export type MockFeedOptions = {
  /** Replaces the timer for tests; defaults to setInterval. */
  setTimer?: (tick: () => void, ms: number) => () => void;
};

/** Per-record look of the simulated patient, so the patient list is not all the same. */
function profileFor(record: string): SyntheticProfile {
  const h = hashString(record);
  return {
    bpm: 62 + (h % 24),
    ventricularRate: 0.04 + ((h >>> 8) % 10) / 100,
  };
}

function defaultTimer(tick: () => void, ms: number): () => void {
  const id = setInterval(tick, ms);
  return () => clearInterval(id);
}

/**
 * Synthetic feed for when the ML service is down. It publishes the same
 * events as the replay, with an artificial trace that has occasional
 * ventricular beats, and is always labelled as simulated by the page.
 */
export function createMockFeed(options: MockFeedOptions = {}): LiveFeed {
  const setTimer = options.setTimer ?? defaultTimer;
  const hub = createFeedHub();
  let connection: FeedConnection = {
    state: "idle",
    kind: "mock",
    attempt: 0,
    message: null,
  };
  let stop: (() => void) | null = null;

  function setConnection(state: FeedConnection["state"]) {
    connection = { ...connection, state };
    hub.connection.emit(connection);
  }

  function start(target: LiveTarget) {
    const random = seededRandom(hashString(target.record));
    const ecg = createSyntheticEcg(profileFor(target.record), random);
    const quality = seededRandom(hashString(`${target.record}:q`));
    const step = TICK_S * target.speed;
    let t = 0;
    let seq = 0;
    let ticks = 0;
    let emittedUntil = -1;
    let alertCount = 0;

    function samplesBlock() {
      const count = Math.round(step * MOCK_FS);
      const values = new Array<number>(count);
      for (let i = 0; i < count; i += 1) {
        values[i] = Math.round(ecg.valueAt(t + i / MOCK_FS) * 1000) / 1000;
      }
      return { count, values };
    }

    function analyse() {
      const horizon = t - DETECTION_DELAY_S;
      const fresh = ecg.beats.filter(
        (b) => b.t > emittedUntil && b.t <= horizon,
      );
      if (fresh.length > 0) {
        emittedUntil = fresh[fresh.length - 1].t;
        const beats: LiveBeat[] = fresh.map((b) => ({
          t: Math.round(b.t * 1000) / 1000,
          recordT: Math.round(b.t * 1000) / 1000,
          cls: b.cls,
          confidence: b.cls === "V" ? 0.93 : 0.97,
          groundTruth: b.cls,
        }));
        hub.beats.emit({ type: "beats", beats });
        // Two ventricular beats in a row is what the rhythm rules call a couplet.
        for (let i = 1; i < fresh.length; i += 1) {
          if (fresh[i].cls === "V" && fresh[i - 1].cls === "V") {
            alertCount += 1;
            const alert: LiveAlert = {
              type: "alert",
              id: `mock-${target.record}-couplet-${alertCount}`,
              alertType: "ventricular_couplet",
              severity: "medium",
              confidence: 0.8,
              message: "Ventricular pattern: two consecutive ventricular beats",
              t: fresh[i - 1].t,
              endT: fresh[i].t,
              recordT: fresh[i - 1].t,
            };
            hub.alerts.emit(alert);
          }
        }
      }

      const recent = ecg.beats.filter((b) => b.t > horizon - WINDOW_S && b.t <= horizon);
      const intervals = recent.slice(1).map((b, i) => b.t - recent[i].t);
      const mean = intervals.reduce((a, b) => a + b, 0) / (intervals.length || 1);
      const hasV = recent.some((b) => b.cls === "V");
      hub.status.emit({
        type: "status",
        state: "streaming",
        record: target.record,
        speed: target.speed,
        t,
        recordT: t,
        loop: 0,
        heartRate: intervals.length > 2 ? Math.round((600 / mean)) / 10 : null,
        rhythm: intervals.length > 5 ? (hasV ? "irregular" : "regular") : "insufficient data",
        quality: Math.round((0.86 + quality() * 0.1) * 1000) / 1000,
        nBeats: recent.length,
        warnings: [],
      });
    }

    hub.status.emit({
      type: "status",
      state: "started",
      record: target.record,
      speed: target.speed,
      t: 0,
      recordT: 0,
      loop: 0,
      heartRate: null,
      rhythm: null,
      quality: null,
      nBeats: null,
      warnings: [],
    });

    stop = setTimer(() => {
      ecg.extendTo(t + step + 1);
      if (target.samples !== false) {
        const { values } = samplesBlock();
        hub.samples.emit({
          type: "samples",
          seq,
          t: Math.round(t * 1000) / 1000,
          recordT: Math.round(t * 1000) / 1000,
          fs: MOCK_FS,
          values,
        });
      }
      seq += 1;
      t += step;
      ticks += 1;
      if (ticks % ANALYSIS_EVERY === 0) {
        analyse();
        ecg.forgetBefore(t - 30);
      }
    }, TICK_S * 1000);
  }

  return {
    connect(target) {
      stop?.();
      stop = null;
      setConnection("connecting");
      start(target);
      setConnection("live");
    },
    disconnect() {
      stop?.();
      stop = null;
      if (connection.state !== "idle") setConnection("idle");
    },
    ...subscriptions(hub),
    getConnection: () => connection,
  };
}
