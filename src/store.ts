import { Action, configureStore, ConfigureStoreOptions, createDynamicMiddleware, createListenerMiddleware, StoreEnhancer, Tuple, UnknownAction } from "@reduxjs/toolkit";
import { listenerMiddleware } from "./middleware";
import Settings from "./settings";
import { Enhancers, ExtractDispatchExtensions, Middlewares, PersistedStore, PersistenceOptions, StorageHandler, ThunkMiddlewareFor } from "./types";
import { clearPersistedStorage, getStoredState, REHYDRATE } from "./utils";

/**
 * Encapsulates the standard RTK `configureStore()` function to add state persistence.
 *
 * This function creates a Redux store that automatically saves and reloads specified
 * slices of the state from a given storage medium. The initial rehydration is
 * handled asynchronously after the store is returned.
 *
 * @param options - The standard RTK `ConfigureStoreOptions`.
 * @param applicationId - A unique ID for the application to namespace the storage keys.
 * @param storageHandler - The storage handler (e.g., `localStorage`) to use for persistence.
 * @param persistenceOptions - Optional configuration for persistence behavior.
 * @param persistenceOptions.rehydrationTimeout - The maximum time in milliseconds to wait for rehydration to complete before timing out. Defaults to 5000.
 * @param persistenceOptions.onRehydrationStart - A callback invoked when the rehydration process begins.
 * @param persistenceOptions.onRehydrationSuccess - A callback invoked when the rehydration process completes successfully.
 * @param persistenceOptions.onRehydrationError - A callback invoked if an error occurs during rehydration.
 * @returns A configured Redux store, enhanced with `rehydrate` and `clearPersistedState` methods.
 *
 * {@link @reduxjs/toolkit#configureStore}
 *
 * @public
 */
export const configurePersistedStore: <
  S extends Record<string, unknown> = any,
  A extends Action = UnknownAction,
  M extends Tuple<Middlewares<S>> = Tuple<[ThunkMiddlewareFor<S>]>,
  E extends Tuple<Enhancers> = Tuple<[
    StoreEnhancer<{
      dispatch: ExtractDispatchExtensions<M>;
    }>,
    StoreEnhancer
  ]>,
  P extends Record<string, unknown> = S
>(
  options: ConfigureStoreOptions<S, A, Tuple<Middlewares<S>>, E, P>,
  applicationId: string,
  storageHandler: StorageHandler,
  persistenceOptions?: PersistenceOptions
) => PersistedStore<S, A, M, E> = <
  S extends Record<string, unknown> = any,
  A extends Action = UnknownAction,
  M extends Tuple<Middlewares<S>> = Tuple<[ThunkMiddlewareFor<S>]>,
  E extends Tuple<Enhancers> = Tuple<[
    StoreEnhancer<{
      dispatch: ExtractDispatchExtensions<M>;
    }>,
    StoreEnhancer
  ]>,
  P extends Record<string, unknown> = S
>(
  options: ConfigureStoreOptions<S, A, Tuple<Middlewares<S>>, E, P>,
  applicationId: string,
  storageHandler: StorageHandler,
  persistenceOptions: PersistenceOptions = {
    rehydrationTimeout: 5000
  }
) => {
  // Set the global storage handler and application ID for the persistence logic.
  Settings.storageHandler = storageHandler;
  Settings.applicationId = applicationId;

  const dynamicMiddleware = createDynamicMiddleware();

  // Create the store, adding the dynamic middleware for rehydration and the main listener for persistence.
  const persistedStore = configureStore({
    ...options,
    middleware: (getDefaultMiddleware) => {
      const m: Tuple<Middlewares<S>> = options.middleware?.(getDefaultMiddleware) || getDefaultMiddleware();
      return m.concat(dynamicMiddleware.middleware).concat(listenerMiddleware.middleware);
    },
  });

  /**
   * Manually triggers the rehydration of the store from storage. This is useful for
   * reloading persisted state at a time other than the initial startup.
   * @returns A promise that resolves when rehydration is complete or rejects on timeout or error.
   * @public
   */
  const rehydrate = () => new Promise<void>(async (resolve, reject) => {
    const signalTimeout = setTimeout(() => {
      reject(new Error("Rehydration timed out"));
    }, persistenceOptions?.rehydrationTimeout);
    const m = createListenerMiddleware();
    m.startListening({
      actionCreator: REHYDRATE,
      effect: (_, l) => {
        clearTimeout(signalTimeout);
        l.unsubscribe();
        resolve();
      },
    });
    dynamicMiddleware.addMiddleware(m.middleware);

    try {
        const storedState: Record<string, unknown> = {};
        await Promise.all(Settings.subscribedSliceIds.map(async (sliceId) => {
        const s = await getStoredState(sliceId);
        if (s) storedState[sliceId] = s;
        }));
        persistedStore.dispatch(REHYDRATE(storedState) as any);
    } catch (error) {
        clearTimeout(signalTimeout);
        reject(error);
    }
  });

  /**
   * Clears all persisted state for the subscribed slices from the storage.
   * This is a destructive action that will remove the data from the storage medium.
   * @returns A promise that resolves when all persisted states have been cleared.
   * @public
   */
  const clearPersistedState = async () => {
    // Clear the persisted state from storage
    await Promise.all(Settings.subscribedSliceIds.map(async (sliceId) => {
      await clearPersistedStorage(sliceId);
    }));
  }

  /**
   * Overrides the original `replaceReducer` function to automatically
   * trigger rehydration after a new reducer has been injected.
   * @internal
   */
  const _replaceReducer = persistedStore.replaceReducer;
  persistedStore.replaceReducer = (nR) => {
    _replaceReducer.call(persistedStore, nR);
    rehydrate();
  }

  // Asynchronously trigger the initial rehydration and execute callbacks.
  persistenceOptions?.onRehydrationStart?.();
  rehydrate()
    .then(persistenceOptions?.onRehydrationSuccess)
    .catch(persistenceOptions?.onRehydrationError);



  return { ...persistedStore, rehydrate, clearPersistedState };
}
