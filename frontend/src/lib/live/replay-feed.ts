import { backoffDelay, type BackoffOptions } from "./backoff";
import { createFeedHub, subscriptions } from "./emitter";
import { parseLiveMessage } from "./parse";
import { createSseParser } from "./sse";
import type { FeedConnection, LiveFeed, LiveTarget } from "./types";

export type ReplayFeedOptions = {
  /** Base path of the streaming route. */
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  backoff?: BackoffOptions;
  /** Failed attempts in a row before the state becomes "unavailable". */
  unavailableAfter?: number;
  /** Silence, in milliseconds, after which an open stream is dropped and retried. */
  stallMs?: number;
};

export const DEFAULT_LIVE_PATH = "/api/live";

/** Errors the service will answer the same way every time, so retrying is pointless. */
class FatalFeedError extends Error {}

function describeFailure(status: number | null, detail: string | null): string {
  if (detail) return detail;
  if (status === null) return "The live service could not be reached.";
  return `The live service answered with status ${status}.`;
}

/**
 * Live feed backed by the ML service replay, reached through the Next.js
 * route handler so the browser never calls the service directly. It reads
 * the Server-Sent Events body with fetch, retries with backoff when the
 * connection drops, and resumes from the last position it received.
 */
export function createReplayFeed(options: ReplayFeedOptions = {}): LiveFeed {
  const {
    baseUrl = DEFAULT_LIVE_PATH,
    fetchImpl,
    backoff,
    unavailableAfter = 3,
    stallMs = 8000,
  } = options;
  const hub = createFeedHub();

  let connection: FeedConnection = {
    state: "idle",
    kind: "replay",
    attempt: 0,
    message: null,
  };
  let generation = 0;
  let controller: AbortController | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let stallTimer: ReturnType<typeof setTimeout> | null = null;

  function setConnection(next: Partial<FeedConnection>) {
    const merged = { ...connection, ...next };
    const changed =
      merged.state !== connection.state ||
      merged.attempt !== connection.attempt ||
      merged.message !== connection.message;
    connection = merged;
    if (changed) hub.connection.emit(connection);
  }

  function clearTimers() {
    if (retryTimer !== null) clearTimeout(retryTimer);
    if (stallTimer !== null) clearTimeout(stallTimer);
    retryTimer = null;
    stallTimer = null;
  }

  function url(target: LiveTarget, offset: number): string {
    const query = new URLSearchParams({
      speed: String(target.speed),
      offset: String(Math.max(0, Math.round(offset * 100) / 100)),
    });
    if (target.samples === false) query.set("samples", "false");
    return `${baseUrl}/${encodeURIComponent(target.record)}?${query.toString()}`;
  }

  async function readFailure(response: Response): Promise<string | null> {
    try {
      const body: unknown = await response.json();
      if (typeof body === "object" && body !== null) {
        const detail = (body as { detail?: unknown }).detail;
        if (typeof detail === "string") return detail;
      }
    } catch {
      // No readable body; the status text is used instead.
    }
    return null;
  }

  async function run(target: LiveTarget, mine: number, startOffset: number) {
    let resumeAt = startOffset;
    let receivedAny = false;

    function alive() {
      return mine === generation;
    }

    function failed(message: string, fatal: boolean) {
      if (!alive()) return;
      clearTimers();
      if (fatal) {
        setConnection({ state: "unavailable", message });
        return;
      }
      const attempt = connection.attempt + 1;
      setConnection({
        state: attempt >= unavailableAfter ? "unavailable" : "reconnecting",
        attempt,
        message,
      });
      retryTimer = setTimeout(
        () => {
          retryTimer = null;
          if (alive()) void run(target, mine, resumeAt);
        },
        backoffDelay(attempt, backoff),
      );
    }

    function armStall() {
      if (stallTimer !== null) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => controller?.abort(), stallMs);
    }

    controller = new AbortController();
    const { signal } = controller;
    try {
      const response = await (fetchImpl ?? fetch)(url(target, resumeAt), {
        signal,
        cache: "no-store",
        headers: { Accept: "text/event-stream" },
      });
      if (!alive()) return;
      if (!response.ok || !response.body) {
        const detail = await readFailure(response);
        const fatal = response.status === 404 || response.status === 400;
        throw fatal
          ? new FatalFeedError(describeFailure(response.status, detail))
          : new Error(describeFailure(response.status, detail));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parser = createSseParser();
      armStall();
      for (;;) {
        const { done, value } = await reader.read();
        if (!alive()) {
          void reader.cancel();
          return;
        }
        if (done) break;
        armStall();
        for (const text of parser.push(decoder.decode(value, { stream: true }))) {
          const event = parseLiveMessage(text);
          if (!event) continue;
          if (!receivedAny) {
            receivedAny = true;
            setConnection({ state: "live", attempt: 0, message: null });
          }
          switch (event.type) {
            case "samples":
              resumeAt = event.recordT + event.values.length / event.fs;
              hub.samples.emit(event);
              break;
            case "beats":
              hub.beats.emit(event);
              break;
            case "alert":
              hub.alerts.emit(event);
              break;
            case "status":
              hub.status.emit(event);
              break;
          }
        }
      }
      throw new Error("The live stream ended.");
    } catch (caught) {
      if (!alive()) return;
      if (caught instanceof FatalFeedError) {
        failed(caught.message, true);
        return;
      }
      const stalled = caught instanceof DOMException && caught.name === "AbortError";
      failed(
        stalled
          ? "The live stream stopped sending data."
          : describeFailure(null, caught instanceof Error && receivedAny ? caught.message : null),
        false,
      );
    }
  }

  return {
    connect(target) {
      generation += 1;
      controller?.abort();
      clearTimers();
      setConnection({ state: "connecting", attempt: 0, message: null });
      void run(target, generation, target.offsetSeconds);
    },
    disconnect() {
      generation += 1;
      controller?.abort();
      controller = null;
      clearTimers();
      setConnection({ state: "idle", attempt: 0, message: null });
    },
    ...subscriptions(hub),
    getConnection: () => connection,
  };
}
