import { demoAccounts } from "@/lib/auth/demo";
import type { KeyValueStore } from "@/lib/auth/storage";
import { samples } from "@/lib/analysis/demo";
import { parseAnalysisResult } from "@/lib/analysis/parse";
import type { AnalysisResult } from "@/lib/analysis/types";

/** The stored copy of the plotted signal. */
export type StoredSignal = { fs: number; samples: number[] };

export type StoredAnalysis = {
  id: string;
  userId: string;
  fileName: string;
  /** ISO date and time of the analysis. */
  createdAt: string;
  result: AnalysisResult;
  /** The trace, or null when it was too large to keep or the file was WFDB. */
  signal: StoredSignal | null;
  /** Where to fetch the trace from when it is not stored, for the seeded samples. */
  signalUrl: string | null;
};

export type NewAnalysis = {
  fileName: string;
  result: AnalysisResult;
  signal: StoredSignal | null;
};

export class HistoryStorageError extends Error {
  constructor() {
    super("Your browser storage is full, so this analysis could not be saved to history.");
    this.name = "HistoryStorageError";
  }
}

export const analysesKey = (userId: string) => `qalb.analyses.${userId}`;

function roundSignal(signal: StoredSignal): StoredSignal {
  return {
    fs: signal.fs,
    samples: signal.samples.map((value) => Math.round(value * 1e4) / 1e4),
  };
}

function isStoredAnalysis(value: unknown): value is StoredAnalysis {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.userId === "string" &&
    typeof item.fileName === "string" &&
    typeof item.createdAt === "string" &&
    typeof item.result === "object" &&
    item.result !== null
  );
}

/** Per-user analysis history on top of a key-value store. */
export function createAnalysisStore(kv: KeyValueStore) {
  function read(userId: string): StoredAnalysis[] {
    const raw = kv.get(analysesKey(userId));
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isStoredAnalysis);
    } catch {
      return [];
    }
  }

  function write(userId: string, items: StoredAnalysis[]): void {
    kv.set(analysesKey(userId), JSON.stringify(items));
  }

  /** Gives the demo patient a small history the first time anyone looks. */
  function seedDemoHistory(): void {
    const userId = demoAccounts.patient.id;
    if (kv.get(analysesKey(userId)) !== null) return;
    const day = 24 * 60 * 60 * 1000;
    const seeded = samples.map((sample, index): StoredAnalysis => ({
      id: `seed-${sample.id}`,
      userId,
      fileName: sample.file,
      createdAt: new Date(Date.now() - (index + 1) * 2 * day).toISOString(),
      result: parseAnalysisResult(sample.fixture),
      signal: null,
      signalUrl: sample.url,
    }));
    try {
      write(userId, seeded);
    } catch {
      // Without storage the demo history simply stays empty.
    }
  }

  /** Newest first. */
  function list(userId: string): StoredAnalysis[] {
    if (userId === demoAccounts.patient.id) seedDemoHistory();
    return read(userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  return {
    list,

    get(userId: string, id: string): StoredAnalysis | null {
      return list(userId).find((item) => item.id === id) ?? null;
    },

    save(userId: string, input: NewAnalysis): StoredAnalysis {
      const base = {
        id: crypto.randomUUID(),
        userId,
        fileName: input.fileName,
        createdAt: new Date().toISOString(),
        result: input.result,
        signalUrl: null,
      };
      const existing = read(userId);
      const withSignal: StoredAnalysis = {
        ...base,
        signal: input.signal ? roundSignal(input.signal) : null,
      };
      try {
        write(userId, [withSignal, ...existing]);
        return withSignal;
      } catch {
        // Too big to keep the trace: keep the result and the beat timeline.
        const withoutSignal: StoredAnalysis = { ...base, signal: null };
        try {
          write(userId, [withoutSignal, ...existing]);
          return withoutSignal;
        } catch {
          throw new HistoryStorageError();
        }
      }
    },

    remove(userId: string, id: string): void {
      write(
        userId,
        read(userId).filter((item) => item.id !== id),
      );
    },

    clear(userId: string): void {
      write(userId, []);
    },
  };
}

export type AnalysisStore = ReturnType<typeof createAnalysisStore>;
