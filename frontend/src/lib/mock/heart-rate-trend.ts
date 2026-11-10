import type { TrendPoint } from "./types";

/** Builds a smooth 24 hour heart rate curve with a short spike near the end. */
export function createHeartRateTrend(points = 97): TrendPoint[] {
  const result: TrendPoint[] = [];
  for (let i = 0; i < points; i += 1) {
    const progress = i / (points - 1);
    const hoursAgo = 24 - progress * 24;
    const daily = 7 * Math.sin(progress * Math.PI * 3 + 0.6);
    const drift = 3 * Math.sin(progress * Math.PI * 7);
    // A brief rise around 19:00 to 20:00, matching the alert on the dashboard.
    const spike = 22 * Math.exp(-(((progress - 0.8) / 0.025) ** 2));
    result.push({
      hoursAgo,
      bpm: 70 + daily + drift + spike,
    });
  }
  return result;
}

export const mockHeartRateTrend: TrendPoint[] = createHeartRateTrend();
