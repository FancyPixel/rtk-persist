import { UnknownAction, EnhancedStore, configureStore, ConfigureStoreOptions } from "@reduxjs/toolkit";
import { listenerMiddleware } from "./middleware";
import { StorageHandler } from "./types";
import Settings from "./settings";

const INIT_ACTION: UnknownAction = { type: '@@INIT-PERSIST' };
const setupPersistedStore = (store: EnhancedStore) => {
  store.dispatch(INIT_ACTION);
};

export const configurePersistedStore = (options: ConfigureStoreOptions, storageHandler: StorageHandler) => {
  Settings.storageHandler = storageHandler;

  const persistedStore = configureStore({
    ...options,
    middleware: (getDefaultMiddleware) => {
      if (options.middleware) return options.middleware(getDefaultMiddleware).prepend(listenerMiddleware.middleware);
      else return getDefaultMiddleware().prepend(listenerMiddleware.middleware);
    }
  });

  setupPersistedStore(persistedStore);

  return persistedStore;
}