/**
 * @module rtk-persist
 * @description
 * This is the main entry point for the `rtk-persist` library. This module
 * exports all the necessary functions and components to integrate persistence
 * into your Redux Toolkit and React applications.
 */
import { createPersistedReducer } from './core/reducer';
import { createPersistedSlice } from './core/slice';
import { configurePersistedStore } from './core/store';
import PersistedProvider from './integrations/react-redux/PersistedProvider';
import { usePersistedStore } from './integrations/react-redux/usePersistedStore';

export {
  /**
   * Creates and configures a Redux Toolkit store with persistence capabilities.
   * This function is asynchronous and returns a promise that resolves with the
   * fully rehydrated store.
   *
   * @see https://redux-toolkit.js.org/api/configureStore
   * @returns A promise that resolves with the configured and rehydrated `PersistedStore`.
   */
  configurePersistedStore,
  /**
   * Wraps an existing reducer with persistence logic. This is useful for adding
   * persistence to reducers not created with `createPersistedSlice`, or for
   * persisting state at the root level.
   *
   * @see createPersistedSlice
   */
  createPersistedReducer,
  /**
   * A wrapper around Redux Toolkit's `createSlice` that adds persistence.
   * Slices created with this function will automatically save their state
   * to the configured storage on change.
   *
   * @see https://redux-toolkit.js.org/api/createSlice
   */
  createPersistedSlice,
  /**
   * A React Provider component that handles the asynchronous nature of store hydration.
   * It ensures that its children are only rendered after the store has been rehydrated,
   * optionally displaying a loader component during this process. It also provides the
   * store to the standard React-Redux `Provider`.
   *
   * @see usePersistedStore
   */
  PersistedProvider,
  /**
   * A React hook for accessing the `PersistedStore` instance from within components.
   * It must be used within a component tree wrapped by `<PersistedProvider />`.
   * This hook allows access to store methods like `rehydrate` and `clearPersistedState`.
   *
   * @see PersistedProvider
   */
  usePersistedStore
};
