import type {
  FeedConnection,
  LiveAlert,
  LiveBeats,
  LiveFeed,
  LiveSamples,
  LiveStatus,
  Unsubscribe,
} from "./types";

export type Emitter<T> = {
  on(listener: (value: T) => void): Unsubscribe;
  emit(value: T): void;
  clear(): void;
};

export function createEmitter<T>(): Emitter<T> {
  const listeners = new Set<(value: T) => void>();
  return {
    on(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit(value) {
      // Copy so a listener that unsubscribes while handling an event is safe.
      for (const listener of [...listeners]) listener(value);
    },
    clear() {
      listeners.clear();
    },
  };
}

/** The five event streams every feed implementation publishes to. */
export type FeedHub = {
  samples: Emitter<LiveSamples>;
  beats: Emitter<LiveBeats>;
  alerts: Emitter<LiveAlert>;
  status: Emitter<LiveStatus>;
  connection: Emitter<FeedConnection>;
};

export function createFeedHub(): FeedHub {
  return {
    samples: createEmitter(),
    beats: createEmitter(),
    alerts: createEmitter(),
    status: createEmitter(),
    connection: createEmitter(),
  };
}

/** The subscribe half of the LiveFeed interface, backed by a hub. */
export function subscriptions(
  hub: FeedHub,
): Pick<
  LiveFeed,
  "onSamples" | "onBeats" | "onAlert" | "onStatus" | "onConnection"
> {
  return {
    onSamples: (listener) => hub.samples.on(listener),
    onBeats: (listener) => hub.beats.on(listener),
    onAlert: (listener) => hub.alerts.on(listener),
    onStatus: (listener) => hub.status.on(listener),
    onConnection: (listener) => hub.connection.on(listener),
  };
}
