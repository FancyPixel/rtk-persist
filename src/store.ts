import { configureStore, ConfigureStoreOptions } from "@reduxjs/toolkit";
import { listenerMiddleware } from "./middleware";
import { StorageHandler } from "./types";
import Settings from "./settings";
import { getStoredState } from "./slice";

export const DEFAULT_INIT_ACTION_TYPE = '@@INIT-PERSIST';

/**
 * A friendly incapsulation of the standard RTK `configureStore()` function
 * to add the option to persist slices.
 *
 * @param options The store configuration.
 * @param storageHandler The storage handler to use to persist the data.
 * @returns A configured Redux store.
 *
 * If persisted slices are present they will be persisted
 * throughout multiple reloads of the store.
 *
 * {@link @reduxjs/toolkit#configureStore}
 *
 * @public
 */
export const configurePersistedStore = (options: ConfigureStoreOptions, storageHandler: StorageHandler) => {
  // Set the default storage handler
  Settings.storageHandler = storageHandler;

  // Create the store adding our listener middleware to react to the state changes
  const persistedStore = configureStore({
    ...options,
    middleware: (getDefaultMiddleware) => {
      if (options.middleware) return options.middleware(getDefaultMiddleware).concat(listenerMiddleware.middleware);
      else return getDefaultMiddleware().concat(listenerMiddleware.middleware);
    }
  });

  Object.keys(persistedStore.getState()).forEach((k) => {
    getStoredState(k).then((initialState) => {
      persistedStore.dispatch({
        type: `${k}\\${DEFAULT_INIT_ACTION_TYPE}`,
        payload: initialState,
      });
    });
  });

  return persistedStore;
}
