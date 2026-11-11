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
