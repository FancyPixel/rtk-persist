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

/**
 * Safely retrieves a nested value from an object using an array of keys.
 * It traverses the object according to the sequence of keys provided.
 *
 * @param obj The object to query. Can be of any type, but functions correctly with nested objects and arrays.
 * @param keys An array of strings or numbers representing the path to the desired value.
 * @returns The nested value if found, otherwise null if the path is invalid or the value is null/undefined.
 */
export const deepGet = <Name extends string = string>(obj: any, keys: (Name)[]): any => {
  return keys.reduce((xs, x) => (xs?.[x] !== undefined && xs?.[x] !== null) ? xs[x] : null, obj);
};

/**
 * Retrieves multiple nested values from an object based on string paths.
 * It supports both dot notation (e.g., 'prop1.prop2') and bracket notation for array access (e.g., 'prop1[0]').
 *
 * @param obj The object to query.
 * @param paths A rest parameter of string paths to retrieve values for.
 * @returns An array containing the retrieved values. If a path is not found, the corresponding value in the array will be null.
 */
export const deepGetByPath = (obj: any, path: string): any => {
  if (path === '') return obj;

  // Convert bracket notation to dot notation, then split into an array of keys.
  const keys = path
    .replace(/\[([^\[\]]*)\]/g, '.$1.')
    .split('.')
    .filter(t => t !== ''); // Filter out empty strings that may arise from the regex replacement.

  return deepGet(obj, keys);
};

/**
 * A helper type to identify primitive values that the recursive
 * path generation should not traverse into.
 */
type Primitive = string | number | boolean | null | undefined;

/**
 * Creates a union of all possible dot-notation paths for a given object type T.
 * This is useful for creating strongly-typed functions that access nested
 * properties of an object like a Redux state. An empty string is also considered a valid path.
 *
 * @example
 * type MyState = { user: { name: string }, posts: { id: number }[] }
 * type MyStatePaths = Paths<MyState>
 * // "" | "user" | "user.name" | "posts" | `posts.${number}` | `posts.${number}.id`
 */
export type Paths<T> = "" | (T extends Primitive
  ? never // Base case: Don't generate paths for primitive types.
  : T extends (infer U)[]
  ? `${number}` | `${number}.${Paths<U>}` // Handle array paths with numeric indices.
  : {
      // For each key in the object...
      [K in keyof T & string]: T[K] extends Primitive
        ? K // If the property is primitive, the path is just the key.
        : K | `${K}.${Paths<T[K]>}`; // Otherwise, recurse into the nested object.
    }[keyof T & string]); // Create a union of all the generated path strings.

/**
 * A strongly-typed path validation function for a given state object type.
 * This function doesn't do anything at runtime; its purpose is to provide
 * compile-time feedback (linter errors) for invalid paths.
 *
 * @param path A path that must be a valid key path within the generic type T.
 */
export const validateNestedPath = <T extends object>(_path: Paths<T>): void => {
  // This function is intentionally empty. Its sole purpose is to enforce
  // type-checking on the 'path' argument at compile time.
};
