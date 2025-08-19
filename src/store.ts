import { Action, configureStore, ConfigureStoreOptions, createDynamicMiddleware, createListenerMiddleware, StoreEnhancer, Tuple, UnknownAction } from "@reduxjs/toolkit";
import { listenerMiddleware } from "./middleware";
import Settings from "./settings";
import { Enhancers, ExtractDispatchExtensions, Middlewares, PersistedStore, REHYDRATE, RESUME_PERSISTANCE, StorageHandler, ThunkMiddlewareFor } from "./types";
import UpdatedAtHelper from "./updatedAtHelper";
import { clearPersistedStorage, getStoredState } from "./utils";

/**
 * A friendly encapsulation of the standard RTK `configureStore()` function
 * to add the option to persist slices.
 *
 * @param options The store configuration.
 * @param applicationId The unique ID that identifies the application.
 * @param storageHandler The storage handler to use to persist the data.
 * @returns A promise that resolves to a configured Redux store, enhanced with persistence capabilities.
 *
 * This allows specified slices to be persisted across multiple store reloads.
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
  storageHandler: StorageHandler
) => Promise<PersistedStore<S, A, M, E>> = async <
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
  storageHandler: StorageHandler
) => {
  // Set the default storage handler and the applicationId
  Settings.storageHandler = storageHandler;
  Settings.applicationId = applicationId;

  const dynamicMiddleware = createDynamicMiddleware();

  // Create the store adding our listener middleware to react to the state changes
  const persistedStore = configureStore({
    ...options,
    middleware: (getDefaultMiddleware) => {
      const m: Tuple<Middlewares<S>> = options.middleware?.(getDefaultMiddleware) || getDefaultMiddleware();
      return m.concat(dynamicMiddleware.middleware).concat(listenerMiddleware.middleware);
    },
  });

  /**
   * Manually triggers the rehydration of the store from the storage.
   * This can be useful if you need to reload the persisted state at a time
   * other than the initial startup.
   * @returns A promise that resolves when the rehydration process is complete.
   * @public
   */
  const rehydrate = () => new Promise<void>(async (resolve, reject) => {
    const m = createListenerMiddleware();
    m.startListening({
      actionCreator: REHYDRATE,
      effect: (_, l) => {
        resolve();
        l.unsubscribe();
      },
    });
    dynamicMiddleware.addMiddleware(m.middleware);

    try {
      const storedState: Record<string, unknown> = {};
      await Promise.all(Settings.subscribedSliceIds.map(async (sliceId) => {
        if (await UpdatedAtHelper.shouldOverride(sliceId)) {
          const s = await getStoredState(sliceId);
          if (s) storedState[sliceId] = s;
        }
      }))
      persistedStore.dispatch(REHYDRATE(storedState) as any);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        // Log an error if the stored data fails to load, but don't block the store creation.
        console.error(
          'rtk-persist: Failed to load or parse persisted state.',
          error
        );
      }
      reject();
    }
  });

  /**
   * Pauses the persistence of the store.
   * While paused, no state changes will be saved to storage.
   * @public
   */
  const pausePersist = () => {
    Settings.pause();
  }

  /**
   * Resumes the persistence of the store after it has been paused.
   * This will trigger an immediate persistence of the current state.
   * @public
   */
  const resumePersist = () => {
    Settings.resume();
    persistedStore.dispatch(RESUME_PERSISTANCE() as any);
  }

  /**
   * Clears all persisted state for the subscribed slices from the storage.
   * This is a destructive action and will remove the data from the storage medium.
   * @returns A promise that resolves when all persisted states have been cleared.
   * @public
   */
  const clearPersistedState = async () => {
    // Clear the persisted state from storage
    await Promise.all(Settings.subscribedSliceIds.map(async (sliceId) => {
      await clearPersistedStorage(sliceId);
    }));
  }

  return new Promise<PersistedStore<S, A, M, E>>(async (resolve) => {
    try {
      const m = createListenerMiddleware();
      m.startListening({
        actionCreator: REHYDRATE,
        effect: (_, l) => {
          resolve({ ...persistedStore, rehydrate, pausePersist, resumePersist, clearPersistedState })
          l.unsubscribe();
        },
      });
      dynamicMiddleware.addMiddleware(m.middleware);

      const storedState: Record<string, unknown> = {};
      await Promise.all(Settings.subscribedSliceIds.map(async (sliceId) => {
        const s = await getStoredState(sliceId);
        if (s) storedState[sliceId] = s;
      }))
      persistedStore.dispatch(REHYDRATE(storedState) as any);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        // Log an error if the stored data fails to load, but don't block the store creation.
        console.error(
          'rtk-persist: Failed to load or parse persisted state.',
          error
        );
      }
      resolve({ ...persistedStore, rehydrate, pausePersist, resumePersist, clearPersistedState });
    }
  });
}
