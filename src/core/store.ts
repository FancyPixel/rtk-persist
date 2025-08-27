import {
  Action,
  configureStore,
  ConfigureStoreOptions,
  createDynamicMiddleware,
  createListenerMiddleware,
  StoreEnhancer,
  Tuple,
  UnknownAction,
} from '@reduxjs/toolkit';
import { listenerMiddleware } from './middleware';
import Settings from './settings';
import {
  Enhancers,
  ExtractDispatchExtensions,
  Middlewares,
  PersistedStore,
  StorageHandler,
  StorePersistenceOptions,
  ThunkMiddlewareFor,
} from './types';
import { clearPersistedStorage, getStoredState, REHYDRATE } from './utils';


/**
 * A wrapper around Redux Toolkit's `configureStore` that enhances it with
 * automatic state persistence. It sets up the necessary middleware and handles
 * the initial asynchronous rehydration of state from storage.
 *
 * @param options - The standard `ConfigureStoreOptions` from Redux Toolkit.
 * @param applicationId - A unique ID for the application, used to namespace storage keys and prevent conflicts.
 * @param storageHandler - The storage engine to use (e.g., `localStorage`, `sessionStorage`).
 * @param persistenceOptions - Optional configuration for persistence behavior.
 * @param persistenceOptions.rehydrationTimeout - Max time in ms to wait for rehydration. Defaults to 5000.
 * @returns A promise that resolves with a configured Redux store, augmented with `rehydrate` and `clearPersistedState` methods.
 *
 * @example
 * ```typescript
 * const store = await configurePersistedStore(
 * { reducer: rootReducer },
 * 'my-app',
 * localStorage,
 * );
 * ```
 *
 * {@link @reduxjs/toolkit#configureStore}
 *
 * @public
 */
export const configurePersistedStore: <
  S extends Record<string, unknown> = any,
  A extends Action = UnknownAction,
  M extends Tuple<Middlewares<S>> = Tuple<[ThunkMiddlewareFor<S>]>,
  E extends Tuple<Enhancers> = Tuple<
    [
      StoreEnhancer<{
        dispatch: ExtractDispatchExtensions<M>;
      }>,
      StoreEnhancer,
    ]
  >,
  P extends Record<string, unknown> = S,
>(
  options: ConfigureStoreOptions<S, A, Tuple<Middlewares<S>>, E, P>,
  applicationId: string,
  storageHandler: StorageHandler,
  persistenceOptions?: StorePersistenceOptions,
) => Promise<PersistedStore<S, A, M, E>> = async <
  S extends Record<string, unknown> = any,
  A extends Action = UnknownAction,
  M extends Tuple<Middlewares<S>> = Tuple<[ThunkMiddlewareFor<S>]>,
  E extends Tuple<Enhancers> = Tuple<
    [
      StoreEnhancer<{
        dispatch: ExtractDispatchExtensions<M>;
      }>,
      StoreEnhancer,
    ]
  >,
  P extends Record<string, unknown> = S,
>(
  options: ConfigureStoreOptions<S, A, Tuple<Middlewares<S>>, E, P>,
  applicationId: string,
  storageHandler: StorageHandler,
  persistenceOptions: StorePersistenceOptions = {
    rehydrationTimeout: 5000,
  },
) => {
  // Configure global settings for the persistence logic.
  Settings.storageHandler = storageHandler;
  Settings.applicationId = applicationId;

  const dynamicMiddleware = createDynamicMiddleware();

  // Create the store, injecting the dynamic and persistence listener middleware.
  const persistedStore = configureStore({
    ...options,
    middleware: (getDefaultMiddleware) => {
      const m: Tuple<Middlewares<S>> =
        options.middleware?.(getDefaultMiddleware) || getDefaultMiddleware();
      return m
        .concat(dynamicMiddleware.middleware)
        .concat(listenerMiddleware.middleware);
    },
  });

  /**
   * Asynchronously rehydrates the state from storage. It dispatches a `REHYDRATE`
   * action with the stored state, allowing reducers to merge it.
   * @returns A promise that resolves when rehydration is complete.
   * @public
   */
  const rehydrate = () =>
    new Promise<void>(async (resolve, reject) => {
      const signalTimeout = setTimeout(() => {
        const timeoutError = new Error(
          `Rehydration timed out after ${persistenceOptions?.rehydrationTimeout}ms`,
        );
        reject(timeoutError);
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
        await Promise.all(
          Settings.subscribedSliceIds.map(async (sliceId) => {
            const s = await getStoredState(sliceId);
            if (s) storedState[sliceId] = s;
          }),
        );
        persistedStore.dispatch(REHYDRATE(storedState) as any);
      } catch (error) {
        clearTimeout(signalTimeout);
        reject(error);
      }
    });

  /**
   * Clears all persisted state for the subscribed slices from storage.
   * This is a destructive action and will permanently remove the data.
   * @returns A promise that resolves when all subscribed states have been cleared.
   * @public
   */
  const clearPersistedState = async () => {
    await Promise.all(
      Settings.subscribedSliceIds.map(async (sliceId) => {
        await clearPersistedStorage(sliceId);
      }),
    );
  };

  /**
   * An override of the original `replaceReducer` function that automatically
   * triggers rehydration after a new reducer is injected, ensuring that the
   * new part of the state is also rehydrated.
   * @internal
   */
  const _replaceReducer = persistedStore.replaceReducer;
  persistedStore.replaceReducer = async (nR) => {
    _replaceReducer.call(persistedStore, nR);
    await rehydrate().catch((error) => {
      if (process.env.NODE_ENV !== 'production') {
        console.error(
          'rtk-persist: Error while rehydrating state.',
          error,
        );
      }
    });
  };

  // Synchronously trigger the initial rehydration on startup.
  await rehydrate().catch((error) => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(
        'rtk-persist: Error while rehydrating state.',
        error,
      );
    }
  });

  return { ...persistedStore, rehydrate, clearPersistedState };
};
