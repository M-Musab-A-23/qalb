import type { Status } from "@/lib/status";
import { feedLabel } from "./index";
import type { FeedConnection } from "./types";

export type ConnectionLabel = {
  label: string;
  /** Maps onto the status colours; null is a neutral, non-status pill. */
  status: Status | null;
  /** One line that explains the state, or null when the label says it all. */
  hint: string | null;
};

/** The wording of the connection badge. */
export function describeConnection(
  connection: FeedConnection,
  paused: boolean,
): ConnectionLabel {
  if (paused) return { label: "Paused", status: null, hint: null };
  switch (connection.state) {
    case "live":
      return {
        label: feedLabel(connection.kind),
        status: connection.kind === "mock" ? "warning" : "normal",
        hint:
          connection.kind === "mock"
            ? (connection.message ??
              "Simulated data, not from a device or a recording.")
            : "Replaying a recorded MIT-BIH test patient.",
      };
    case "connecting":
      return { label: "Connecting", status: "warning", hint: null };
    case "reconnecting":
      return {
        label: "Reconnecting",
        status: "warning",
        hint: connection.message ?? "The live stream was interrupted.",
      };
    case "unavailable":
      return {
        label: "ML service not running",
        status: "critical",
        hint:
          "Start it with uvicorn api:app --port 8000 in the ml folder. This page keeps retrying.",
      };
    default:
      return { label: "Not connected", status: null, hint: null };
  }
}

/** The one-line note under the trace, which must say plainly when the data is simulated. */
export function traceNote(
  kind: FeedConnection["kind"],
  record: string,
  agreement: { agreed: number; compared: number },
): string {
  if (kind === "mock") {
    return "Simulated ECG made in the browser because the ML service is not running. It is not a recording and not a model result.";
  }
  const base = `Replay of MIT-BIH record ${record}, a held-out test patient. A marker shows the model's class; "(ref X)" means the annotation says X.`;
  return agreement.compared > 0
    ? `${base} The model matches the annotation on ${agreement.agreed} of ${agreement.compared} beats.`
    : base;
}

/** The subtitle under the page title. */
export function sourceSubtitle(
  kind: FeedConnection["kind"],
  record: string,
): string {
  return kind === "mock"
    ? "simulated ECG"
    : `replay of MIT-BIH record ${record}`;
}
