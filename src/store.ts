import { Action, configureStore, ConfigureStoreOptions, StoreEnhancer, Tuple, UnknownAction } from "@reduxjs/toolkit";
import { listenerMiddleware } from "./middleware";
import { DEFAULT_INIT_ACTION_TYPE, StorageHandler } from "./types";
import Settings from "./settings";
import { getStoredState } from "./slice";
import { Middlewares } from "@reduxjs/toolkit/dist/configureStore";
import { ThunkMiddlewareFor } from "@reduxjs/toolkit/dist/getDefaultMiddleware";
import { ExtractDispatchExtensions } from "@reduxjs/toolkit/dist/tsHelpers";

type Enhancers = ReadonlyArray<StoreEnhancer>;

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
export const configurePersistedStore = <S = any, A extends Action = UnknownAction, M extends Tuple<Middlewares<S>> = Tuple<[ThunkMiddlewareFor<S>]>, E extends Tuple<Enhancers> = Tuple<[
  StoreEnhancer<{
      dispatch: ExtractDispatchExtensions<M>;
  }>,
  StoreEnhancer
]>, P = S>(options: ConfigureStoreOptions<S, A, Tuple<Middlewares<S>>, E, P>, storageHandler: StorageHandler) => {
  // Set the default storage handler
  Settings.storageHandler = storageHandler;

  // Create the store adding our listener middleware to react to the state changes
  const persistedStore = configureStore({
    ...options,
    middleware: (getDefaultMiddleware) => {
      const m: Tuple<Middlewares<S>> = options.middleware?.(getDefaultMiddleware) || getDefaultMiddleware();
      return m.concat(listenerMiddleware.middleware);
    }
  });

  const state = persistedStore.getState();
  if (state && typeof state === 'object') {
    Object.keys(state).forEach((k) => {
      getStoredState(k).then((initialState) => {
        persistedStore.dispatch({
          type: `${k}\\${DEFAULT_INIT_ACTION_TYPE}`,
          payload: initialState,
        } as any);
      });
    });
  }

  return persistedStore;
}
