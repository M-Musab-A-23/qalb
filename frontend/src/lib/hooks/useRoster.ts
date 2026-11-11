"use client";

import { useEffect, useReducer, useRef } from "react";
import { createLiveFeed } from "@/lib/live";
import {
  initialMonitorState,
  reduceMonitor,
  type MonitorState,
} from "@/lib/live/state";
import type { FeedConnection, FeedKind, LiveAlert, LiveEvent } from "@/lib/live/types";

export type RosterSource = {
  patientId: string;
  deviceId: string;
  record: string;
  offsetSeconds: number;
  /** An offline device has no stream. */
  online: boolean;
};

export type RosterEntry = {
  state: MonitorState;
  connection: FeedConnection | null;
};

type Action =
  | { type: "event"; id: string; event: LiveEvent }
  | { type: "connection"; id: string; connection: FeedConnection };

type RosterMap = Record<string, RosterEntry>;

function reducer(map: RosterMap, action: Action): RosterMap {
  const entry = map[action.id] ?? { state: initialMonitorState(), connection: null };
  if (action.type === "connection") {
    return { ...map, [action.id]: { ...entry, connection: action.connection } };
  }
  return {
    ...map,
    [action.id]: { ...entry, state: reduceMonitor(entry.state, action.event) },
  };
}

/**
 * One status-only feed per patient, for the clinician's patient list. The
 * patient being watched in full is skipped, since the monitor already has it.
 */
export function useRoster(
  sources: RosterSource[],
  skipId: string | null,
  onAlert?: (source: RosterSource, alert: LiveAlert, kind: FeedKind) => void,
): RosterMap {
  const [map, dispatch] = useReducer(reducer, {} as RosterMap);
  const alertHandler = useRef(onAlert);
  const latest = useRef(sources);

  useEffect(() => {
    alertHandler.current = onAlert;
    latest.current = sources;
  });

  const wanted = sources
    .filter((s) => s.online && s.patientId !== skipId)
    .map((s) => s.patientId)
    .join(",");

  useEffect(() => {
    const ids = wanted ? wanted.split(",") : [];
    const stops = ids.map((id) => {
      const source = latest.current.find((s) => s.patientId === id);
      if (!source) return () => {};
      const feed = createLiveFeed();
      const off = [
        feed.onConnection((connection) => dispatch({ type: "connection", id, connection })),
        feed.onBeats((event) => dispatch({ type: "event", id, event })),
        feed.onStatus((event) => dispatch({ type: "event", id, event })),
        feed.onAlert((event) => {
          dispatch({ type: "event", id, event });
          alertHandler.current?.(source, event, feed.getConnection().kind);
        }),
      ];
      feed.connect({
        record: source.record,
        speed: 1,
        offsetSeconds: source.offsetSeconds,
        samples: false,
      });
      return () => {
        off.forEach((unsubscribe) => unsubscribe());
        feed.disconnect();
      };
    });
    return () => stops.forEach((stop) => stop());
  }, [wanted]);

  return map;
}
