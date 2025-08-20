/**
 * Global value that stores for each slice the last time
 * it was updated and dumped locally
 * @private
 */
let cache: Record<string, { localUpdatedAt: number; storedUpdatedAt: number; }> = {};

/**
 * Global class that handles the last time each slice was
 * updated and saved locally.
 * @internal
 */
export default class UpdatedAtHelper {
  constructor() {
    // This class is not meant to be instantiated.
    throw new Error('UpdatedAtHelper is a static class and cannot be instantiated.');
  }

  /**
   * Returns the last time the slice was saved to storage.
   * It returns the cached value if set, otherwise 0.
   *
   * @param name - The name of the slice.
   * @returns The last time the slice was saved to storage, as a timestamp.
   *
   * @internal
   */
  static async getStoredUpdateAtOf(name: string): Promise<number> {
    // If there's already a cached version of the updateAt return it
    if (cache[name]?.storedUpdatedAt !== undefined) return cache[name].storedUpdatedAt;

    // Otherwise return a default value
    return 0;
  }

  /**
   * Determines if the local slice state is newer than the state in storage.
   *
   * @param name - The name of the slice.
   * @returns A promise that resolves to true if the slice should be saved locally.
   *
   * @internal
   */
  static async shouldSave(name: string): Promise<boolean> {
    const stored = await this.getStoredUpdateAtOf(name);
    return (cache[name]?.localUpdatedAt ?? 0) > stored;
  }

  /**
   * Updates the cache to reflect that a slice has been saved to storage.
   *
   * @param name - The name of the slice.
   *
   * @internal
   */
  static onSave(name: string) {
    const updatedAt = new Date().getTime();
    cache[name] = { localUpdatedAt: cache[name]?.localUpdatedAt ?? updatedAt, storedUpdatedAt: updatedAt };
  }

  /**
   * Updates the cache to reflect that a slice's state has changed locally.
   *
   * @param name - The name of the slice.
   *
   * @internal
   */
  static onStateChange(name: string) {
    cache[name] = { ...cache[name], localUpdatedAt: new Date().getTime() };
  }
}

/**
 * A testing-specific extension of UpdatedAtHelper that provides methods
 * to control its internal state for predictable test outcomes.
 * @internal
 */
export class TestUpdatedAtHelper extends UpdatedAtHelper {
  /**
   * Resets the internal cache to its default empty state.
   */
  static _clearCache() {
    cache = {};
  }

  /**
   * Manually sets the local timestamp for a slice.
   * This is useful for simulating scenarios where the local state was updated externally.
   * @param name - The name of the slice.
   * @param timestamp - The timestamp to set.
   */
  static _setLocalUpdatedAtForTest(name: string, timestamp: number) {
    cache[name] = { ...(cache[name] || { storedUpdatedAt: 0 }), localUpdatedAt: timestamp };
  }

  /**
   * Manually sets the stored timestamp for a slice.
   * This is useful for simulating scenarios where storage was updated externally.
   * @param name - The name of the slice.
   * @param timestamp - The timestamp to set.
   */
  static _setStoredUpdatedAtForTest(name: string, timestamp: number) {
    cache[name] = { ...(cache[name] || { localUpdatedAt: 0 }), storedUpdatedAt: timestamp };
  }
}
