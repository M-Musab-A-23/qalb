export type BackoffOptions = {
  baseMs?: number;
  maxMs?: number;
  /** Random spread as a fraction of the delay, 0 for none. */
  jitter?: number;
  random?: () => number;
};

/** Delay before reconnect attempt number `attempt` (1 is the first retry). */
export function backoffDelay(
  attempt: number,
  options: BackoffOptions = {},
): number {
  const {
    baseMs = 1000,
    maxMs = 15000,
    jitter = 0.2,
    random = Math.random,
  } = options;
  const raw = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt - 1));
  const spread = raw * jitter * (random() * 2 - 1);
  return Math.max(0, Math.round(raw + spread));
}
