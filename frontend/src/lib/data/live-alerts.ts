import type { AlertItem, AlertSource } from "@/lib/mock";
import type { Status } from "@/lib/status";
import type { LiveAlert, LiveAlertSeverity } from "@/lib/live/types";

export type LiveAlertInput = {
  patientId: string;
  deviceId: string;
  record: string;
  alert: LiveAlert;
  source: AlertSource;
};

export type LiveAlertStore = {
  /** Adds the alert unless it repeats a recent one. Returns the stored item, or null. */
  add(input: LiveAlertInput): AlertItem | null;
  /** Newest first. The array is replaced on every change, so it is safe as a snapshot. */
  list(): AlertItem[];
  acknowledge(id: string): void;
  acknowledgeAll(): void;
  clear(): void;
  subscribe(listener: () => void): () => void;
};

export type LiveAlertStoreOptions = {
  /** Alerts of one type for one patient closer together than this are one episode. */
  cooldownMs?: number;
  /** Most alerts kept; the oldest are dropped. */
  max?: number;
  now?: () => number;
};

const SEVERITY_STATUS: Record<LiveAlertSeverity, Status> = {
  high: "critical",
  medium: "warning",
  low: "normal",
};

const SEVERITY_RANK: Record<Status, number> = { normal: 0, warning: 1, critical: 2 };

const TITLES: Record<string, string> = {
  ventricular_run: "Ventricular run",
  ventricular_couplet: "Ventricular couplet",
  frequent_ventricular_beats: "Frequent ventricular beats",
  irregular_rhythm: "Irregular rhythm",
  fast_rate: "Fast heart rate",
  slow_rate: "Slow heart rate",
};

export function alertTitle(alertType: string): string {
  if (TITLES[alertType]) return TITLES[alertType];
  const words = alertType.replace(/_/g, " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1) : "Rhythm alert";
}

export function severityStatus(severity: LiveAlertSeverity): Status {
  return SEVERITY_STATUS[severity];
}

function clock(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export const SOURCE_LABELS: Record<AlertSource, string> = {
  "live-replay": "Live replay",
  simulated: "Simulated",
};

export function createLiveAlertStore(options: LiveAlertStoreOptions = {}): LiveAlertStore {
  const { cooldownMs = 60_000, max = 100, now = Date.now } = options;
  let items: AlertItem[] = [];
  /** When each patient and alert type was last added, and how severe it was. */
  const lastSeen = new Map<string, { at: number; rank: number }>();
  const listeners = new Set<() => void>();
  let counter = 0;

  function publish(next: AlertItem[]) {
    items = next;
    for (const listener of [...listeners]) listener();
  }

  return {
    add({ patientId, deviceId, record, alert, source }) {
      const at = now();
      const status = SEVERITY_STATUS[alert.severity];
      const key = `${patientId}:${alert.alertType}`;
      const previous = lastSeen.get(key);
      // A repeat inside the cooldown is the same episode, unless it got worse.
      if (
        previous &&
        at - previous.at < cooldownMs &&
        SEVERITY_RANK[status] <= previous.rank
      ) {
        return null;
      }
      lastSeen.set(key, { at, rank: SEVERITY_RANK[status] });
      counter += 1;
      const item: AlertItem = {
        id: `live-${counter}`,
        severity: status,
        title: alertTitle(alert.alertType),
        patientId,
        deviceId,
        detail: alert.message,
        note:
          source === "simulated"
            ? "Simulated feed, not a model result"
            : `${SOURCE_LABELS[source]}, record ${record}, model confidence ${Math.round(alert.confidence * 100)}%`,
        time: clock(at),
        acknowledged: false,
        source,
      };
      publish([item, ...items].slice(0, max));
      return item;
    },
    list: () => items,
    acknowledge(id) {
      if (!items.some((a) => a.id === id && !a.acknowledged)) return;
      publish(items.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
    },
    acknowledgeAll() {
      if (items.every((a) => a.acknowledged)) return;
      publish(items.map((a) => ({ ...a, acknowledged: true })));
    },
    clear() {
      lastSeen.clear();
      if (items.length > 0) publish([]);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
