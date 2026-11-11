import { createFeedHub, subscriptions } from "./emitter";
import type { FeedConnection, LiveFeed, LiveTarget } from "./types";

export type FallbackOptions = {
  /** Failed replay attempts in a row before the simulated feed takes over. */
  failuresBeforeFallback?: number;
};

export const FALLBACK_MESSAGE =
  "The ML service is not running, so a simulated feed is shown.";

/**
 * Prefers the primary feed and switches to the fallback when the primary
 * cannot connect. The primary keeps retrying in the background; once it is
 * live again the page moves back to it.
 */
export function createFallbackFeed(
  primary: LiveFeed,
  fallback: LiveFeed,
  options: FallbackOptions = {},
): LiveFeed {
  const { failuresBeforeFallback = 2 } = options;
  const hub = createFeedHub();
  let active: LiveFeed = primary;
  let target: LiveTarget | null = null;
  let connection: FeedConnection = {
    state: "idle",
    kind: primary.getConnection().kind,
    attempt: 0,
    message: null,
  };
  const subscriptionsOff: Array<() => void> = [];

  function setConnection(next: FeedConnection) {
    connection = next;
    hub.connection.emit(connection);
  }

  function forward(source: LiveFeed) {
    subscriptionsOff.push(
      source.onSamples((e) => source === active && hub.samples.emit(e)),
      source.onBeats((e) => source === active && hub.beats.emit(e)),
      source.onAlert((e) => source === active && hub.alerts.emit(e)),
      source.onStatus((e) => source === active && hub.status.emit(e)),
    );
  }

  function useFallback() {
    if (!target || active === fallback) return;
    active = fallback;
    fallback.connect(target);
    setConnection({
      state: "live",
      kind: fallback.getConnection().kind,
      attempt: 0,
      message: FALLBACK_MESSAGE,
    });
  }

  function usePrimary() {
    if (active === primary) return;
    fallback.disconnect();
    active = primary;
  }

  forward(primary);
  forward(fallback);

  subscriptionsOff.push(
    primary.onConnection((next) => {
      if (!target) return;
      if (active === fallback) {
        // Still on the simulated feed until the primary is really live again.
        if (next.state === "live") {
          usePrimary();
          setConnection(next);
        }
        return;
      }
      if (next.state !== "live" && next.attempt >= failuresBeforeFallback) {
        useFallback();
        return;
      }
      setConnection(next);
    }),
    // The fallback's own connection events are not shown: its state is reported above.
  );

  return {
    connect(next) {
      target = next;
      if (active === fallback) {
        // Stay on the simulated feed for the new target; the primary retries
        // in the background and takes over again once it is live.
        fallback.connect(next);
        primary.connect(next);
        return;
      }
      setConnection({
        state: "connecting",
        kind: primary.getConnection().kind,
        attempt: 0,
        message: null,
      });
      primary.connect(next);
    },
    disconnect() {
      target = null;
      primary.disconnect();
      fallback.disconnect();
      active = primary;
      setConnection({ ...connection, state: "idle", attempt: 0, message: null });
    },
    ...subscriptions(hub),
    getConnection: () => connection,
  };
}
