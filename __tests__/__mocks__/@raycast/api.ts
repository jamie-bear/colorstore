// Mock implementation of @raycast/api LocalStorage for testing
const store = new Map<string, string>();

export const LocalStorage = {
  async getItem(key: string): Promise<string | undefined> {
    return store.get(key) ?? undefined;
  },
  async setItem(key: string, value: string): Promise<void> {
    store.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    store.delete(key);
  },
  async allItems(): Promise<Record<string, string>> {
    return Object.fromEntries(store);
  },
  async clear(): Promise<void> {
    store.clear();
  },
  _reset(): void {
    store.clear();
  },
};
