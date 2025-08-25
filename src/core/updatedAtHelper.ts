/**
 * An in-memory cache to store the last update timestamps for each slice.
 * `localUpdatedAt` tracks when the slice's state last changed in the app.
 * `storedUpdatedAt` tracks when the slice was last successfully saved to storage.
 * @private
 */
let cache: Record<
  string,
  { localUpdatedAt: number; storedUpdatedAt: number }
> = {};

/**
 * A static utility class that manages timestamps to prevent unnecessary
 * storage writes. It tracks when a slice's state has changed locally versus
 * when it was last persisted, ensuring that `writePersistedStorage` is only
 * called when there are new changes to save.
 * @internal
 */
export default class UpdatedAtHelper {
  constructor() {
    throw new Error(
      'UpdatedAtHelper is a static class and cannot be instantiated.',
    );
  }

  /**
   * Retrieves the timestamp of when the slice was last saved to storage.
   *
   * @param name - The name of the slice.
   * @returns The last known storage update timestamp, or 0 if not available.
   * @internal
   */
  static getStoredUpdatedAtOf(name: string): number {
    return cache[name]?.storedUpdatedAt ?? 0;
  }

  /**
   * Determines if a slice's state has changed since it was last saved.
   *
   * @param name - The name of the slice.
   * @returns A boolean indicating whether the slice needs to be saved.
   * @internal
   */
  static shouldSave(name: string): boolean {
    const stored = this.getStoredUpdatedAtOf(name);
    return (cache[name]?.localUpdatedAt ?? 0) > stored;
  }

  /**
   * Updates the timestamps for a slice after it has been successfully saved,
   * synchronizing the local and stored update times.
   *
   * @param name - The name of the slice that was saved.
   * @internal
   */
  static onSave(name: string) {
    const updatedAt = new Date().getTime();
    cache[name] = {
      localUpdatedAt: cache[name]?.localUpdatedAt ?? updatedAt,
      storedUpdatedAt: updatedAt,
    };
  }

  /**
   * Updates the local timestamp for a slice whenever its state changes,
   * marking it as "dirty" and potentially needing persistence.
   *
   * @param name - The name of the slice whose state has changed.
   * @internal
   */
  static onStateChange(name: string) {
    cache[name] = { ...cache[name], localUpdatedAt: new Date().getTime() };
  }
}

/**
 * A testing-specific extension of `UpdatedAtHelper` that provides methods
 * to manipulate its internal cache for predictable test outcomes.
 * @internal
 */
export class TestUpdatedAtHelper extends UpdatedAtHelper {
  /**
   * Resets the internal timestamp cache to an empty state.
   */
  static _clearCache() {
    cache = {};
  }

  /**
   * Manually sets the local "dirty" timestamp for a slice in tests.
   * @param name - The name of the slice.
   * @param timestamp - The timestamp to set.
   */
  static _setLocalUpdatedAtForTest(name: string, timestamp: number) {
    cache[name] = {
      ...(cache[name] || { storedUpdatedAt: 0 }),
      localUpdatedAt: timestamp,
    };
  }

  /**
   * Manually sets the "stored" timestamp for a slice in tests.
   * @param name - The name of the slice.
   * @param timestamp - The timestamp to set.
   */
  static _setStoredUpdatedAtForTest(name: string, timestamp: number) {
    cache[name] = {
      ...(cache[name] || { localUpdatedAt: 0 }),
      storedUpdatedAt: timestamp,
    };
  }
}
