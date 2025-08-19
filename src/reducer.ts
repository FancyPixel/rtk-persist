import {
  ActionReducerMapBuilder,
  createReducer,
  PayloadAction
} from '@reduxjs/toolkit';
import { Builder } from './extraReducersBuilder';
import { listenerMiddleware } from './middleware';
import Settings from './settings';
import { NotFunction, ReducerWithInitialState, REHYDRATE } from './types';
import UpdatedAtHelper from './updatedAtHelper';
import { writePersistedStorage } from './utils';

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
  // Subscribe the reducer to be persisted
  Settings.subscribeSlice(reducerName);

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
    const b = new Builder(builder, UpdatedAtHelper.onStateChange.bind(null, reducerName));
    // Add a case to handle the rehydration of state from storage.
    b.builder.addCase(REHYDRATE.toString(), (_state, action: PayloadAction<Record<ReducerName, S> | null>): void | S => {
      if (action.payload?.[reducerName]) return action.payload[reducerName];
    });
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
      if (!await UpdatedAtHelper.shouldSave(reducerName) || !Settings.isPersistenceEnabled) return;
      const state = getState();
      writePersistedStorage(state, reducerName);
    },
  });

  /**
   * Listens for the rehydration action to update the local timestamp,
   * ensuring the state isn't immediately re-saved.
   * @internal
   */
  startAppListening({
    actionCreator: REHYDRATE,
    effect: () => {
      UpdatedAtHelper.onStateChange(reducerName);
    },
  });

  return reducer;
};
