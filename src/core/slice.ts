import {
  createSlice,
  CreateSliceOptions,
  PayloadAction,
  SliceCaseReducers,
  SliceSelectors,
} from '@reduxjs/toolkit';
import { Builder } from './extraReducersBuilder';
import { listenerMiddleware } from './middleware';
import Settings from './settings';
import {
  NestedPath,
  PersistedSlice,
  RehydrateActionPayload,
  SlicePersistenceOptions,
} from './types';
import UpdatedAtHelper from './updatedAtHelper';
import { deepGetByPath, REHYDRATE, writePersistedStorage } from './utils';

/**
 * A wrapper around Redux Toolkit's `createSlice` that enhances it with
 * automatic state persistence. Slices created with this function will have
 * their state saved to storage on every change and rehydrated on startup.
 *
 * This function must be used with a store configured by `configurePersistedStore`.
 *
 * @public
 * @param sliceOptions - The standard `CreateSliceOptions` object from Redux Toolkit.
 * @param persistenceOptions - Optional configuration for persistence behavior.
 * @param persistenceOptions.nestedPath - A dot-separated string path indicating where the
 * slice's state is located within the root state. If not provided, it defaults to
 * `reducerPath` or `name` from `sliceOptions`.
 * @param persistenceOptions.onPersist - A function that transforms the slice's state
 * *before* it is saved to storage. This is useful for saving a different version of the state
 * than what is used in the application.
 * @param persistenceOptions.onRehydrate - A function that transforms the state *after* it is
 * loaded from storage but *before* it is placed in the Redux store. This is useful for
 * migrating old state shapes or re-instantiating complex objects.
 * @returns A Redux slice object with persistence enabled, augmented with a
 * `nestedPath` property for internal state tracking.
 *
 * @example
 * // Basic usage
 * const counterSlice = createPersistedSlice({
 * name: 'counter',
 * initialState: { value: 0 },
 * reducers: {
 * increment: (state) => {
 * state.value += 1;
 * },
 * },
 * });
 *
 * // Usage with persistence options
 * const userSlice = createPersistedSlice({
 * name: 'user',
 * initialState: { data: null, loadedAt: null },
 * reducers: {
 * // ...
 * },
 * }, {
 * onRehydrate: (savedState) => ({ ...savedState, loadedAt: new Date() }),
 * onPersist: (state) => ({ data: state.data }), // Only persist the 'data' field
 * });
 */
export const createPersistedSlice = <
  SliceState,
  SavedState,
  Name extends string,
  PCR extends SliceCaseReducers<SliceState>,
  ReducerPath extends string = Name,
  PersistedSelectors extends SliceSelectors<SliceState> = SliceSelectors<SliceState>,
  Nesting extends NestedPath<Name | ReducerPath> = ReducerPath,
>(
  sliceOptions: CreateSliceOptions<
    SliceState,
    PCR,
    Name,
    ReducerPath,
    PersistedSelectors
  >,
  persistenceOptions?: SlicePersistenceOptions<
    SliceState,
    SavedState,
    Name,
    ReducerPath,
    Nesting
  >,
): PersistedSlice<
  SliceState,
  PCR,
  Name,
  ReducerPath,
  PersistedSelectors,
  Nesting
> => {
  // Register the slice for persistence tracking.
  Settings.subscribeSlice(sliceOptions.name);

  /**
   * A timeout variable to manage the debouncing of storage writes.
   * @internal
   */
  let debounceTimeout: NodeJS.Timeout | null = null;

  /**
   * The full dot-separated path to the slice's state within the root state object.
   * @internal
   */
  const finalNestedPath = (persistenceOptions?.nestedPath ??
    sliceOptions.reducerPath ??
    sliceOptions.name) as Nesting;

  /**
   * Debounces the `writePersistedStorage` function to prevent excessive writes
   * during rapid state changes. The state is saved 100ms after the last change.
   * @param state - The current root state of the Redux store.
   * @internal
   */
  const onDump = (state: Record<string, any>) => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      const sliceState = deepGetByPath(state, finalNestedPath);
      if (sliceState === null) {
        if (process.env.NODE_ENV !== 'production') {
          console.error(`DUMP: No state found for ${sliceOptions.name}, check if the nestedPath is corrected.`);
        }
      } else {
        if (persistenceOptions && 'onPersist' in persistenceOptions) {
          writePersistedStorage(
            persistenceOptions.onPersist(sliceState),
            sliceOptions.name,
          );
        } else {
          writePersistedStorage(sliceState, sliceOptions.name);
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
   * The main slice, created with persistence-specific enhancements.
   * @internal
   */
  const slice = createSlice({
    ...sliceOptions,
    extraReducers: (builder) => {
      // Add a case to handle the rehydration of state from storage.
      builder.addCase(
        REHYDRATE.toString(),
        (
          _state,
          action: PayloadAction<
            RehydrateActionPayload<Name, SliceState | SavedState>
          >,
        ): void | SliceState => {
          if (action.payload?.[sliceOptions.name]) {
            if (persistenceOptions && 'onRehydrate' in persistenceOptions) {
              return persistenceOptions.onRehydrate(
                action.payload[sliceOptions.name] as SavedState,
              );
            } else {
              return action.payload[sliceOptions.name] as SliceState;
            }
          }
        },
      );
      // Wrap the builder to automatically track state changes for persistence.
      const b = new Builder(
        builder,
        UpdatedAtHelper.onStateChange.bind(null, sliceOptions.name),
      );
      // Allow the user to add their own extra reducers.
      sliceOptions.extraReducers?.(b);
    },
  });

  /**
   * Listens for each action generated by the slice to trigger persistence
   * after the state is updated by its own reducers.
   * @internal
   */
  Object.keys(slice.actions).forEach((type) => {
    startAppListening({
      type: `${slice.name}/${type}`,
      effect: (_action, { getState }) => {
        const state = getState();
        onDump(state);
      },
    });
  });

  /**
   * Listens for external actions to check if this slice's state was updated
   * by an extra reducer, triggering persistence if necessary.
   * @internal
   */
  startAppListening({
    predicate: (action) => {
      // Exclude the slice's own actions and the rehydrate action.
      if (
        action.type === REHYDRATE.toString() ||
        action.type.startsWith(`${slice.name}/`)
      )
        return false;
      return true;
    },
    effect: async (_action, { getState }) => {
      if (!(await UpdatedAtHelper.shouldSave(sliceOptions.name))) return;
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
    effect: () => UpdatedAtHelper.onSave(sliceOptions.name),
  });

  // Augment the slice with persistence-specific properties and return.
  return Object.assign(slice, {
    nestedPath: finalNestedPath,
  }) as PersistedSlice<
    SliceState,
    PCR,
    Name,
    ReducerPath,
    PersistedSelectors,
    Nesting
  >;
};
