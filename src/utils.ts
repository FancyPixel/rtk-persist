import { createAction } from "@reduxjs/toolkit";
import Settings from "./settings";
import { RehydrateActionPayload } from "./types";
import UpdatedAtHelper from "./updatedAtHelper";

/**
 * Action dispatched to rehydrate the store with persisted state.
 * @internal
 */
export const REHYDRATE = createAction<RehydrateActionPayload>('@@INIT-PERSIST');

/**
 * Generates the unique storage key for a given slice name.
 * @param name - The name of the slice.
 * @returns The formatted storage key.
 * @internal
 */
export const getStorageName = (name: string) => `persist:${Settings.applicationId}-${name}`;

/**
 * Writes the updated state to the selected storage.
 *
 * @param state - The state to be persisted.
 * @param name - The name of the state slice.
 *
 * @internal
 */
export async function writePersistedStorage<Name extends string, SliceState>(state: SliceState, name: Name) {
  const storageName = getStorageName(name);
  try {
    await Settings.storageHandler.setItem(
      storageName,
      JSON.stringify(state),
    );
    UpdatedAtHelper.onSave(name);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error("rtk-persist: Failed to save state.", error);
    }
  }
}

/**
 * Retrieves the stored state of a slice if it exists.
 *
 * @param name - The name of the slice to retrieve.
 * @returns A promise that resolves to the stored state of the slice, or null if not found.
 *
 * @internal
 */
export async function getStoredState<T>(name: string): Promise<Partial<T> | null> {
  try {
    const storageJson = (await Settings.storageHandler.getItem(getStorageName(name)));
    if (!storageJson) return null;
    return JSON.parse(storageJson);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      // Log an error if the store fails to load
      console.error(
        'rtk-persist: Failed to load or parse stored state.',
        error
      );
    }
  }
  return null;
}

/**
 * Clears the stored data for a specific slice from the selected storage.
 *
 * @param name - The unique name for the state slice.
 *
 * @internal
 */
export async function clearPersistedStorage(name: string) {
  const storageName = getStorageName(name);
  await Settings.storageHandler.removeItem(storageName);
}
