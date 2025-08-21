import {
  ActionReducerMapBuilder,
  createReducer,
  PayloadAction
} from '@reduxjs/toolkit';
import { Builder } from './extraReducersBuilder';
import { listenerMiddleware } from './middleware';
import Settings from './settings';
import { NotFunction, ReducerWithInitialState, RehydrateActionPayload } from './types';
import UpdatedAtHelper from './updatedAtHelper';
import { REHYDRATE, writePersistedStorage } from './utils';

/**
 * A utility function that creates a persisted reducer. It wraps the standard
 * Redux Toolkit `createReducer` function, adding persistence capabilities.
 *
 * The state will be persisted across multiple application reloads.
 * This function requires the use of {@link configurePersistedStore}.
 *
 * @remarks
 * The body of every case reducer is implicitly wrapped with `produce` from Immer,
 * allowing you to write "mutating" logic that is safely translated into immutable updates.
 *
 * @param reducerName - A unique string name for the reducer. This name is used as the key in the root state object and for storage.
 * @param initialState - The initial state for the reducer. Can be a value or a lazy initializer function.
 * @param mapOrBuilderCallback - A callback that receives a `builder` object to define case reducers via `builder.addCase`, `builder.addMatcher`, and `builder.addDefaultCase`.
 * @example
```ts
import {
  createAction,
  createReducer,
  UnknownAction,
  PayloadAction,
} from "@reduxjs/toolkit";

const increment = createAction<number>("increment");
const decrement = createAction<number>("decrement");

function isActionWithNumberPayload(
  action: UnknownAction
): action is PayloadAction<number> {
  return typeof action.payload === "number";
}

const reducer = createPersistedReducer(
  'counters',
  {
    counter: 0,
    sumOfNumberPayloads: 0,
    unhandledActions: 0,
  },
  (builder) => {
    builder
      .addCase(increment, (state, action) => {
        state.counter += action.payload;
      })
      .addCase(decrement, (state, action) => {
        state.counter -= action.payload;
      })
      .addMatcher(isActionWithNumberPayload, (state, action) => {})
      .addDefaultCase((state, action) => {});
  }
);
```
 * @public
 */
export const createPersistedReducer: <
  ReducerName extends string,
  S extends NotFunction<any>
>(
  reducerName: ReducerName,
  initialState: S | (() => S),
  mapOrBuilderCallback: (builder: ActionReducerMapBuilder<S>) => void,
) => ReducerWithInitialState<S> = <ReducerName extends string, S extends NotFunction<any>>(
  reducerName: ReducerName,
  initialState: S | (() => S),
  mapOrBuilderCallback: (builder: ActionReducerMapBuilder<S>) => void,
) => {
  /**
   * Registers the reducer's name to the list of persisted slices.
   * This allows the persistence logic to identify which parts of the state to manage.
   */
  Settings.subscribeSlice(reducerName);

  /**
   * A timeout variable to manage the debouncing of the storage write.
   * @internal
   */
  let debounceTimeout: NodeJS.Timeout | null = null;

  /**
   * Debounces the `writePersistedStorage` function to prevent excessive writes
   * during rapid state changes. The state is saved 100ms after the last change.
   * @param state - The current root state of the Redux store.
   * @internal
   */
  const onDump = (state: Record<ReducerName, S>) => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      writePersistedStorage(state[reducerName], reducerName);
    }, 100);
  };

  /**
   * Creates a typed instance of the listener middleware's startListening function.
   * @internal
   */
  const startAppListening =
    listenerMiddleware.startListening.withTypes<
      Record<ReducerName, S>
    >();

  /**
   * Creates the main reducer, extending the builder to track state changes
   * and handle the rehydration action.
   * @internal
   */
  const reducer = createReducer(initialState, builder => {
    // Add a case to handle the rehydration of state from storage.
    builder.addCase(REHYDRATE.toString(), (_state, action: PayloadAction<RehydrateActionPayload<ReducerName, S>>): void | S => {
      if (action.payload?.[reducerName]) return action.payload[reducerName];
    });
    const b = new Builder(builder, UpdatedAtHelper.onStateChange.bind(null, reducerName));
    mapOrBuilderCallback(b);
  }) as ReducerWithInitialState<S>;

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
      if (!await UpdatedAtHelper.shouldSave(reducerName)) return;
      const state = getState();
      onDump(state);
    },
  });

  /**
   * Listens for the rehydration action to update the local timestamp
   * @internal
   */
  startAppListening({
    actionCreator: REHYDRATE,
    effect: () => UpdatedAtHelper.onSave(reducerName),
  });

  /**
   * Attaches the unique reducer name to the reducer function itself.
   * This allows other parts of the persistence logic to identify the reducer
   * and its corresponding state slice.
   * @public
   */
  reducer.reducerName = reducerName;

  return reducer;
};
