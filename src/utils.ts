/**
 * @file This file contains core utility functions for the rtk-persist library,
 * including storage interaction, state traversal, and type helpers.
 */

import { createAction } from '@reduxjs/toolkit';
import Settings from './settings';
import { RehydrateActionPayload } from './types';
import UpdatedAtHelper from './updatedAtHelper';

/**
 * An action dispatched to rehydrate the store with state from storage.
 * This action is typically dispatched once on application startup.
 * @internal
 */
export const REHYDRATE = createAction<RehydrateActionPayload>('@@INIT-PERSIST');

/**
 * Generates a unique, namespaced storage key for a given slice.
 * @param name - The name of the slice.
 * @returns The formatted storage key (e.g., `persist:myApp-mySlice`).
 * @internal
 */
export const getStorageName = (name: string) =>
  `persist:${Settings.applicationId}-${name}`;

/**
 * Serializes and writes the state of a slice to the configured storage.
 *
 * @param state - The state to be persisted.
 * @param name - The name of the slice.
 * @internal
 */
export async function writePersistedStorage<Name extends string, SliceState>(
  state: SliceState,
  name: Name,
) {
  const storageName = getStorageName(name);
  try {
    await Settings.storageHandler.setItem(storageName, JSON.stringify(state));
    UpdatedAtHelper.onSave(name);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('rtk-persist: Failed to save state.', error);
    }
  }
}

/**
 * Retrieves and deserializes the state of a slice from storage.
 *
 * @param name - The name of the slice to retrieve.
 * @returns A promise that resolves to the stored state, or null if not found or if parsing fails.
 * @internal
 */
export async function getStoredState<T>(
  name: string,
): Promise<Partial<T> | null> {
  try {
    const storageJson = await Settings.storageHandler.getItem(
      getStorageName(name),
    );
    if (!storageJson) return null;
    return JSON.parse(storageJson);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(
        'rtk-persist: Failed to load or parse stored state.',
        error,
      );
    }
  }
  return null;
}

/**
 * Removes the stored data for a specific slice from storage.
 *
 * @param name - The name of the slice to clear.
 * @internal
 */
export async function clearPersistedStorage(name: string) {
  const storageName = getStorageName(name);
  await Settings.storageHandler.removeItem(storageName);
}

/**
 * Safely retrieves a nested value from an object using an array of keys.
 *
 * @param obj - The object to query.
 * @param keys - An array of keys representing the path to the desired value.
 * @returns The nested value if found. Returns `null` for invalid paths partway
 * through, and `undefined` if the final key doesn't exist.
 * @internal
 */
export const deepGet = <Name extends string = string>(
  obj: any,
  keys: Name[],
): any => {
  let current = obj;
  for (const key of keys) {
    // If at any point the path leads to a non-object (and is not the end of the path),
    // we cannot go deeper, so the path is considered invalid.
    if (typeof current !== 'object' || current === null) {
      return null;
    }
    current = current[key];
  }
  // The final value can legitimately be undefined, so we return it.
  return current;
};

/**
 * Retrieves a nested value from an object using a dot-separated path string.
 * Supports both dot notation (`'prop1.prop2'`) and bracket notation for arrays
 * (`'prop1[0]'` or `prop1['key-with-hyphens']`).
 *
 * @param obj - The object to query.
 * @param path - A string path to the desired value.
 * @returns The nested value if found. Returns `null` for invalid paths partway
 * through, and `undefined` if the final key doesn't exist. Returns the original
 * object for an empty path.
 * @internal
 */
export const deepGetByPath = (obj: any, path: string): any => {
  if (path === '') return obj;

  // Convert bracket notation to dot notation, then split into keys.
  const keys = path
    .replace(/\[([^\[\]]*)\]/g, '.$1.') // Convert bracket notation
    .split('.')
    .filter(Boolean) // Remove empty strings from the path array
    .map((key) => key.replace(/["']/g, '')); // Strip quotes from keys

  return deepGet(obj, keys);
};

/**
 * A helper type to identify primitive values.
 * @internal
 */
type Primitive = string | number | boolean | null | undefined;

/**
 * A utility type that generates a union of all possible dot-notation paths for a given object type `T`.
 * This is used to provide strong typing for nested state access.
 *
 * @example
 * type MyState = { user: { name: string }, posts: { id: number }[] }
 * type MyStatePaths = Paths<MyState>
 * // Result: "" | "user" | "user.name" | "posts" | `posts.${number}` | `posts.${number}.id`
 * @internal
 */
export type Paths<T> = '' | (T extends Primitive
  ? never
  : T extends (infer U)[]
  ? `${number}` | `${number}.${Paths<U>}`
  : {
      [K in keyof T & string]: T[K] extends Primitive
        ? K
        : K | `${K}.${Paths<T[K]>}`;
    }[keyof T & string]);

/**
 * A type-only validation function for nested paths. It provides compile-time
 * errors for invalid paths without any runtime overhead.
 *
 * @param _path - A path that must be a valid key path within the generic type `T`.
 * @internal
 */
export const validateNestedPath = <T extends object>(_path: Paths<T>): void => {
  // This function is intentionally empty. Its purpose is to enforce
  // type-checking on the '_path' argument at compile time.
};
