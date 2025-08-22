/**
 * @module rtk-persist
 * @description
 * The main entry point for the `rtk-persist` library. This module exports the
 * necessary functions to seamlessly integrate persistence into your Redux Toolkit
 * applications. Whether you're setting up a new store, creating individual
 * persisted slices, or wrapping existing reducers, these utilities provide
 * a simple and efficient way to save and rehydrate your Redux state.
 */
import { createPersistedReducer } from './reducer';
import { createPersistedSlice } from './slice';
import { configurePersistedStore } from './store';

export {
  /**
   * A wrapper around Redux Toolkit's `configureStore` that automatically
   * sets up the persistence middleware and initial state rehydration.
   * Use this for a quick and easy setup of a fully persisted store.
   */
  configurePersistedStore,
  /**
   * A utility to wrap an existing reducer with persistence logic. This is
   * useful when you need to add persistence to a reducer that was not
   * created with `createPersistedSlice`.
   */
  createPersistedReducer,
  /**
   * A wrapper around Redux Toolkit's `createSlice` that adds persistence
   * capabilities. Slices created with this function will automatically
   * have their state saved to storage on every change.
   */
  createPersistedSlice
};
