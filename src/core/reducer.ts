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
 *
 * This function enhances a standard reducer with automatic state persistence,
 * saving its state to storage and rehydrating it when the application starts.
 * It must be used with a store configured by `configurePersistedStore`.
 *
 * @public
 * @param reducerName - A unique name for the reducer. This name is used as the key
 * in both the root state and the underlying storage.
 * @param initialState - The initial state for the reducer, same as in `createReducer`.
 * @param mapOrBuilderCallback - A callback that receives a `builder` object to define
 * case reducers. This builder is wrapped to automatically track state changes for persistence.
 * @param persistenceOptions - Optional configuration for customizing persistence behavior.
 * @returns A reducer function enhanced with persistence capabilities.
 *
 * @example
 * ```typescript
 * const counterReducer = createPersistedReducer(
 * 'counter',
 * { value: 0 },
 * (builder) => {
 * builder.addCase(increment, (state) => {
 * state.value++;
 * });
 * },
 * {
 * // Optional: Specify a different path in the root state.
 * nestedPath: 'nested.counter',
 * // Optional: Transform state before saving.
 * onPersist: (state) => ({ value: state.value.toString() }),
 * // Optional: Transform state after loading from storage.
 * onRehydrate: (persistedState) => ({ value: parseInt(persistedState.value, 10) }),
 * }
 * );
 * ```
 */
export const createPersistedReducer = <
  ReducerName extends string,
  S extends NotFunction<any>,
  SavedState,
  Nesting extends NestedPath<ReducerName> = ReducerName,
>(
  reducerName: ReducerName,
  initialState: S | (() => S),
  mapOrBuilderCallback: (builder: ActionReducerMapBuilder<S>) => void,
  persistenceOptions?: ReducerPersistenceOptions<ReducerName, S, SavedState, Nesting>,
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
   * @internal
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
      if (reducerState === null) {
        if (process.env.NODE_ENV !== 'production') {
          console.error(`DUMP: No state found for ${reducerName}, check if the nestedPath is corrected.`);
        }
      } else {
        if (persistenceOptions && 'onPersist' in persistenceOptions) {
          writePersistedStorage(persistenceOptions.onPersist(reducerState), reducerName);
        } else {
          writePersistedStorage(reducerState, reducerName);
        }
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
      (_state, action: PayloadAction<RehydrateActionPayload<ReducerName, S | SavedState>>):
        | void
        | S => {
        if (action.payload?.[reducerName]) {
          if (persistenceOptions && 'onRehydrate' in persistenceOptions) {
            return persistenceOptions.onRehydrate(action.payload[reducerName] as SavedState);
          } else {
            return action.payload[reducerName] as S;
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
