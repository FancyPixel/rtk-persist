import {
  ActionReducerMapBuilder,
  createReducer,
  PayloadAction,
} from '@reduxjs/toolkit';
import { Builder } from './extraReducersBuilder';
import { listenerMiddleware } from './middleware';
import Settings from './settings';
import {
  NestedPath,
  NotFunction,
  PersistedReducer,
  ReducerPersistenceOptions,
  RehydrateActionPayload,
} from './types';
import UpdatedAtHelper from './updatedAtHelper';
import { deepGetByPath, REHYDRATE, writePersistedStorage } from './utils';

/**
 * Creates a persisted reducer that wraps Redux Toolkit's `createReducer`.
 * This function enhances a standard reducer with automatic state persistence,
 * saving its state to storage and rehydrating it on app startup.
 *
 * This function must be used with a store configured by `configurePersistedStore`.
 *
 * @param reducerName - A unique string name for the reducer. This name serves as the key in both the root state and the storage.
 * @param initialState - The initial state for the reducer.
 * @param mapOrBuilderCallback - A callback that receives a `builder` object to define case reducers, similar to the original `createReducer`.
 * @param nestedPath - An optional dot-separated string path indicating where the reducer's state is located within the root state. If not provided, `reducerName` is used.
 * @public
 */
export const createPersistedReducer = <
  ReducerName extends string,
  S extends NotFunction<any>,
  Nesting extends NestedPath<ReducerName> = ReducerName,
>(
  reducerName: ReducerName,
  initialState: S | (() => S),
  mapOrBuilderCallback: (builder: ActionReducerMapBuilder<S>) => void,
  persistenceOptions?: ReducerPersistenceOptions<ReducerName, S, Nesting>,
): PersistedReducer<S, ReducerName, Nesting> => {
  // Register the reducer for persistence tracking.
  Settings.subscribeSlice(reducerName);

  /**
   * A timeout variable to manage the debouncing of storage writes.
   * @internal
   */
  let debounceTimeout: NodeJS.Timeout | null = null;

  /**
   * The full dot-separated path to the reducer's state within the root state object.
   * Defaults to the reducer's name if `nestedPath` is not provided.
   */
  const finalNestedPath = (persistenceOptions?.nestedPath ?? reducerName) as Nesting;

  /**
   * Debounces the `writePersistedStorage` function to prevent excessive writes
   * during rapid state changes. The state is saved 100ms after the last change.
   * @param state - The current root state of the Redux store.
   * @internal
   */
  const onDump = (state: Record<string, any>) => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      const reducerState = deepGetByPath(state, finalNestedPath);
      if (persistenceOptions && 'onDump' in persistenceOptions) {
        writePersistedStorage(persistenceOptions.onDump(reducerState), reducerName);
      } else {
        writePersistedStorage(reducerState, reducerName);
      }
    }, 100);
  };

  /**
   * A typed instance of the listener middleware's `startListening` function.
   * @internal
   */
  const startAppListening =
    listenerMiddleware.startListening.withTypes<Record<string, any>>();

  /**
   * The main reducer, created with persistence-specific enhancements.
   * @internal
   */
  const reducer = createReducer(initialState, (builder) => {
    // Add a case to handle the rehydration of state from storage.
    builder.addCase(
      REHYDRATE.toString(),
      (_state, action: PayloadAction<RehydrateActionPayload<ReducerName, S>>):
        | void
        | S => {
        if (action.payload?.[reducerName]) {
          if (persistenceOptions && 'onRehydrate' in persistenceOptions) {
            return persistenceOptions.onRehydrate(action.payload[reducerName]);
          } else {
            return action.payload[reducerName];
          }
        }
      },
    );
    // Wrap the builder to automatically track state changes for persistence.
    const b = new Builder(
      builder,
      UpdatedAtHelper.onStateChange.bind(null, reducerName),
    );
    mapOrBuilderCallback(b);
  });

  /**
   * Listens for any action (except rehydration) to check if the state
   * has been updated and needs to be persisted.
   * @internal
   */
  startAppListening({
    predicate: (action) => {
      // Exclude the rehydrate action from triggering a save.
      if (action.type === REHYDRATE.toString()) return false;
      return true;
    },
    effect: async (_action, { getState }) => {
      if (!(await UpdatedAtHelper.shouldSave(reducerName))) return;
      const state = getState();
      onDump(state);
    },
  });

  /**
   * Listens for the rehydration action to update the local timestamp,
   * ensuring synchronization with storage.
   * @internal
   */
  startAppListening({
    actionCreator: REHYDRATE,
    effect: () => UpdatedAtHelper.onSave(reducerName),
  });

  // Augment the reducer with persistence-specific properties and return.
  return Object.assign(reducer, {
    reducerName,
    nestedPath: finalNestedPath,
  }) as PersistedReducer<S, ReducerName, Nesting>;
};
