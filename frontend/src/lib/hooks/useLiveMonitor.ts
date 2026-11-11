"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { RollingTrace } from "@/lib/live/buffer";
import { createLiveFeed } from "@/lib/live";
import {
  initialMonitorState,
  reduceMonitor,
  type MonitorState,
} from "@/lib/live/state";
import type {
  FeedConnection,
  FeedKind,
  LiveAlert,
  LiveSpeed,
} from "@/lib/live/types";

/** Seconds of signal kept for the scrolling trace. */
export const TRACE_SECONDS = 12;
const TRACE_FS = 120;

export type MonitorOptions = {
  record: string;
  speed: LiveSpeed;
  /** Where the replay starts in the record, in seconds. */
  offsetSeconds: number;
  /** While true no connection is open; resuming continues from where it stopped. */
  paused: boolean;
  /** Called for every alert the feed raises, with the kind of feed it came from. */
  onAlert?: (alert: LiveAlert, kind: FeedKind) => void;
};

export type Monitor = {
  connection: FeedConnection;
  state: MonitorState;
  /** Rolling samples and beat markers for the trace. Read it from an animation frame. */
  trace: RollingTrace;
};

type Action =
  | { type: "reset" }
  | { type: "event"; event: Parameters<typeof reduceMonitor>[1] };

function reducer(state: MonitorState, action: Action): MonitorState {
  return action.type === "reset"
    ? initialMonitorState()
    : reduceMonitor(state, action.event);
}

const IDLE: FeedConnection = {
  state: "idle",
  kind: "replay",
  attempt: 0,
  message: null,
};

/**
 * Connects a live feed for the given record and keeps the monitor state and
 * the trace buffer up to date. Sample blocks go straight into the buffer
 * without re-rendering; beats, alerts and status update the cards.
 */
export function useLiveMonitor(options: MonitorOptions): Monitor {
  const { record, speed, offsetSeconds, paused } = options;
  const [trace] = useState(() => new RollingTrace(TRACE_SECONDS, TRACE_FS));
  const [state, dispatch] = useReducer(reducer, undefined, initialMonitorState);
  const [connection, setConnection] = useState<FeedConnection>(IDLE);
  const onAlert = useRef(options.onAlert);
  const position = useRef<{ record: string; seconds: number } | null>(null);

  useEffect(() => {
    onAlert.current = options.onAlert;
  });

  useEffect(() => {
    if (paused) return;
    const feed = createLiveFeed();
    // Continue from where a pause stopped, when it is the same record.
    const resume = position.current?.record === record ? position.current.seconds : null;
    const startAt = resume ?? offsetSeconds;
    if (resume === null) {
      trace.reset();
      dispatch({ type: "reset" });
    }

    const off = [
      feed.onConnection(setConnection),
      feed.onSamples((event) => {
        trace.setRate(event.fs);
        trace.pushSamples(event.t, event.values);
        position.current = {
          record,
          seconds: event.recordT + event.values.length / event.fs,
        };
      }),
      feed.onBeats((event) => {
        for (const beat of event.beats) {
          trace.pushBeat({ t: beat.t, cls: beat.cls, groundTruth: beat.groundTruth });
        }
        dispatch({ type: "event", event });
      }),
      feed.onAlert((event) => {
        dispatch({ type: "event", event });
        onAlert.current?.(event, feed.getConnection().kind);
      }),
      feed.onStatus((event) => dispatch({ type: "event", event })),
    ];

    feed.connect({ record, speed, offsetSeconds: startAt });
    return () => {
      off.forEach((unsubscribe) => unsubscribe());
      feed.disconnect();
    };
  }, [record, speed, offsetSeconds, paused, trace]);

  return {
    connection: paused ? { ...IDLE, kind: connection.kind } : connection,
    state,
    trace,
  };
}
