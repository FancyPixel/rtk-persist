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

/**
 * Clears the stored data from the selected storage
 *
 * @param name - string: a uniq name for the state slice implemented.
 *
 * @public
 */
export async function clearPersistedStorage(name: string) {
  const storageName = getStorageName(name);
  await Settings.storageHandler.removeItem(storageName);
}
