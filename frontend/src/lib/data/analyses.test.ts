import { beforeEach, describe, expect, it } from "vitest";
import { offlineDemoResult } from "@/lib/analysis/demo";
import { demoAccounts } from "@/lib/auth/demo";
import { createMemoryStore, type KeyValueStore } from "@/lib/auth/storage";
import {
  analysesKey,
  createAnalysisStore,
  HistoryStorageError,
  type AnalysisStore,
} from "./analyses";

let kv: KeyValueStore;
let store: AnalysisStore;

const entry = (name: string, signal = { fs: 360, samples: [0.12345678, 1, 2] }) => ({
  fileName: name,
  result: offlineDemoResult("normal"),
  signal,
});

beforeEach(() => {
  kv = createMemoryStore();
  store = createAnalysisStore(kv);
});

describe("analysis history", () => {
  it("starts empty for a new account", () => {
    expect(store.list("user-1")).toEqual([]);
  });

  it("saves, lists newest first and finds one by id", async () => {
    const first = store.save("user-1", entry("a.csv"));
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = store.save("user-1", entry("b.csv"));
    expect(store.list("user-1").map((item) => item.fileName)).toEqual(["b.csv", "a.csv"]);
    expect(store.get("user-1", first.id)?.fileName).toBe("a.csv");
    expect(second.signalUrl).toBeNull();
  });

  it("rounds the stored trace to keep it small", () => {
    const saved = store.save("user-1", entry("a.csv"));
    expect(saved.signal?.samples[0]).toBe(0.1235);
  });

  it("keeps every user's history separate", () => {
    store.save("user-1", entry("mine.csv"));
    expect(store.list("user-2")).toEqual([]);
  });

  it("deletes one analysis and leaves the rest", () => {
    const keep = store.save("user-1", entry("keep.csv"));
    const drop = store.save("user-1", entry("drop.csv"));
    store.remove("user-1", drop.id);
    expect(store.list("user-1").map((item) => item.id)).toEqual([keep.id]);
  });

  it("clears every analysis for one user only", () => {
    store.save("user-1", entry("a.csv"));
    store.save("user-2", entry("b.csv"));
    store.clear("user-1");
    expect(store.list("user-1")).toEqual([]);
    expect(store.list("user-2")).toHaveLength(1);
  });

  it("ignores corrupt storage", () => {
    kv.set(analysesKey("user-1"), "{not json");
    expect(store.list("user-1")).toEqual([]);
    kv.set(analysesKey("user-1"), JSON.stringify([{ nope: true }]));
    expect(store.list("user-1")).toEqual([]);
  });

  it("keeps the result without the trace when the trace does not fit", () => {
    const limited: KeyValueStore = {
      ...kv,
      set(key, value) {
        if (value.includes('"samples"')) throw new Error("QuotaExceededError");
        kv.set(key, value);
      },
    };
    const saved = createAnalysisStore(limited).save("user-1", entry("big.csv"));
    expect(saved.signal).toBeNull();
    expect(store.list("user-1")).toHaveLength(1);
  });

  it("reports when nothing can be stored", () => {
    const full: KeyValueStore = {
      ...kv,
      set() {
        throw new Error("QuotaExceededError");
      },
    };
    expect(() => createAnalysisStore(full).save("user-1", entry("a.csv"))).toThrow(
      HistoryStorageError,
    );
  });
});

describe("demo patient history", () => {
  const demoId = demoAccounts.patient.id;

  it("is seeded with the two sample analyses the first time it is read", () => {
    const items = store.list(demoId);
    expect(items.map((item) => item.fileName).sort()).toEqual([
      "sample_normal_100.csv",
      "sample_ventricular_233.csv",
    ]);
    expect(items.every((item) => item.signalUrl?.startsWith("/samples/"))).toBe(true);
  });

  it("does not seed other accounts", () => {
    store.list("user-1");
    expect(kv.get(analysesKey("user-1"))).toBeNull();
  });

  it("stays empty after being cleared", () => {
    store.list(demoId);
    store.clear(demoId);
    expect(store.list(demoId)).toEqual([]);
  });
});
