/** The small slice of Storage the auth layer needs, so tests can fake it. */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export function createMemoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    get: (key) => data.get(key) ?? null,
    set: (key, value) => void data.set(key, value),
    remove: (key) => void data.delete(key),
  };
}

/**
 * Wraps a browser Storage. Reads and removals never throw; a failed write
 * throws so the caller can tell the person that nothing was saved.
 */
export function createBrowserStore(storage: Storage): KeyValueStore {
  return {
    get(key) {
      try {
        return storage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      storage.setItem(key, value);
    },
    remove(key) {
      try {
        storage.removeItem(key);
      } catch {
        // Nothing to remove if storage is blocked.
      }
    },
  };
}
