import Settings from "./settings";

export const getStorageName = (name: string) => `persisted-storage-${name}`;

/**
 * Return the stored data of a slice if saved
 *
 * @returns The stored state of the slice if saved
 *
 * @public
 */
export async function getStoredState<T>(name: string): Promise<Partial<T> | null> {
  try {
    const storageJson = (await Settings.storageHandler.getItem(getStorageName(name)));
    if (!storageJson) return null;
    return JSON.parse(storageJson);
  } catch (e) {
    // console.error(e);
  }
  return null;
}