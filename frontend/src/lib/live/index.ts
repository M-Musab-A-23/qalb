import { createFallbackFeed } from "./fallback-feed";
import { createMockFeed } from "./mock-feed";
import { createReplayFeed } from "./replay-feed";
import type { FeedKind, LiveFeed } from "./types";

export * from "./types";
export { FALLBACK_MESSAGE } from "./fallback-feed";

/**
 * - `auto`: replay from the ML service, simulated feed if it is not running
 * - `replay`: replay only; an unreachable service shows an unavailable state
 * - `mock`: always the simulated feed
 */
export type LiveFeedMode = "auto" | "replay" | "mock";

export function resolveFeedMode(value: string | undefined): LiveFeedMode {
  const text = value?.trim().toLowerCase();
  return text === "replay" || text === "mock" ? text : "auto";
}

/** Reads NEXT_PUBLIC_LIVE_FEED, which the build inlines into the browser code. */
export function configuredFeedMode(): LiveFeedMode {
  return resolveFeedMode(process.env.NEXT_PUBLIC_LIVE_FEED);
}

export type CreateFeedOptions = {
  mode?: LiveFeedMode;
  /** Replacements for tests. */
  replay?: LiveFeed;
  mock?: LiveFeed;
};

/**
 * The one place that decides where live data comes from. To use a real
 * backend feed, return it from here; the pages only use the LiveFeed interface.
 */
export function createLiveFeed(options: CreateFeedOptions = {}): LiveFeed {
  const mode = options.mode ?? configuredFeedMode();
  if (mode === "mock") return options.mock ?? createMockFeed();
  const replay = options.replay ?? createReplayFeed();
  if (mode === "replay") return replay;
  return createFallbackFeed(replay, options.mock ?? createMockFeed());
}

export function feedLabel(kind: FeedKind): string {
  return kind === "mock" ? "Simulated feed" : "Live replay";
}
