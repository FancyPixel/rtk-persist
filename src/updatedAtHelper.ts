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
    cache = {};
  }

  protected static getCacheName(name: string) {
    return `persisted-storage-${name}-update-at`;
  }

  /**
   * Returns the last time the slice was saved locally
   * It returns the valued cached if set
   *
   * @params The name of the slice
   * @returns The last time the slice was saved locally
   *
   * @public
   */
  static async getStoredUpdateAtOf(name: string): Promise<number> {
    // If there's already a cached version of the updateAt return it
    if (cache[name]?.storedUpdatedAt !== undefined) return cache[name].storedUpdatedAt;

    // Othwerwise return a defualt value
    return 0;
  }

  /**
   * Returns true if the slice should be saved locally.
   *
   * @params The name of the slice
   * @returns If the slice should be saved locally
   *
   * @public
   */
  static async shouldSave(name: string): Promise<boolean> {
    const stored = await this.getStoredUpdateAtOf(name);
    return (cache[name]?.localUpdatedAt ?? 0) > stored;
  }

  /**
   * Sets the last time the slice was saved locally.
   *
   * @params The name of the slice
   *
   * @public
   */
  static onSave(name: string) {
    const updatedAt = new Date().getTime();
    cache[name] = { localUpdatedAt: cache[name]?.localUpdatedAt ?? updatedAt, storedUpdatedAt: updatedAt };
  }

  /**
   * Sets the last time the slice was updated.
   *
   * @param storageHandler - The selected storage handler.
   *
   * @public
   */
  static onStateChange(name: string) {
    cache[name] = { ...cache[name], localUpdatedAt: new Date().getTime() };
  }
}
