import {
  ActionReducerMapBuilder,
  createReducer,
  PayloadAction
} from '@reduxjs/toolkit';
import { Builder } from './extraReducersBuilder';
import { listenerMiddleware } from './middleware';
import Settings from './settings';
import { DEFAULT_INIT_ACTION_TYPE, NotFunction, PersistedReducer } from './types';
import UpdatedAtHelper from './updatedAtHelper';
import { getStorageName } from './utils';

/**
 * A utility function that allows defining a reducer as a mapping from action
 * type to *case reducer* functions that handle these action types. The
 * reducer's initial state is passed as the first argument.
 *
 * The state will be persisted throughout multiple reloads.
 * It requires to use {@link configurePersistedStore | configurePersistedStore}
 *
 * @remarks
 * The body of every case reducer is implicitly wrapped with a call to
 * `produce()` from the [immer](https://github.com/mweststrate/immer) library.
 * This means that rather than returning a new state object, you can also
 * mutate the passed-in state object directly; these mutations will then be
 * automatically and efficiently translated into copies, giving you both
 * convenience and immutability.
 *
 * @overloadSummary
 * This function accepts a callback that receives a `builder` object as its argument.
 * That builder provides `addCase`, `addMatcher` and `addDefaultCase` functions that may be
 * called to define what actions this reducer will handle.
 *
 * @param reducerName - string: a uniq name for the state slice implemented.
 * @param initialState - `State | (() => State)`: The initial state that should be used when the reducer is called the first time. This may also be a "lazy initializer" function, which should return an initial state value when called. This will be used whenever the reducer is called with `undefined` as its state value, and is primarily useful for cases like reading initial state from `localStorage`.
 * @param builderCallback - `(builder: Builder) => void` A callback that receives a *builder* object to define
 *   case reducers via calls to `builder.addCase(actionCreatorOrType, reducer)`.
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

const { reducer } = createPersistedReducer(
  'counters',
  {
    counter: 0,
    sumOfNumberPayloads: 0,
    unhandledActions: 0,
  },
  (builder) => {
    builder
      .addCase(increment, (state, action) => {
        // action is inferred correctly here
        state.counter += action.payload;
      })
      // You can chain calls, or have separate `builder.addCase()` lines each time
      .addCase(decrement, (state, action) => {
        state.counter -= action.payload;
      })
      // You can apply a "matcher function" to incoming actions
      .addMatcher(isActionWithNumberPayload, (state, action) => {})
      // and provide a default case if no other handlers matched
      .addDefaultCase((state, action) => {});
  }
);
```
 * @public
 */
export const createPersistedReducer: <ReducerName extends string, S extends NotFunction<any>>(reducerName: ReducerName, initialState: S | (() => S), mapOrBuilderCallback: (builder: ActionReducerMapBuilder<S>) => void, filtersSlice?: (state: S) => Partial<S>) => PersistedReducer<ReducerName, S> = <ReducerName extends string, S extends NotFunction<any>>(
  reducerName: ReducerName,
  initialState: S | (() => S),
  mapOrBuilderCallback: (builder: ActionReducerMapBuilder<S>) => void,
  filtersSlice: (state: S) => Partial<S> = state => state,
) => {
  const storageName = getStorageName(reducerName);

  /**
   * Creates a typed version of the startListening function
   * of the listener middlerware
   *
   * {@link @reduxjs/toolkit#createListenerMiddleware}
   */
  const startAppListening =
    listenerMiddleware.startListening.withTypes<
      Record<ReducerName, S>
    >();

  /**
   * Writes the updated state to the selected storage
   *
   * @param storedData The state to be persisted
   *
   * @internal
   */
  async function writePersistedStorage(storedData: S) {
    await Settings.storageHandler.setItem(
      storageName,
      JSON.stringify(filtersSlice(storedData)),
    );
    UpdatedAtHelper.onSave(reducerName);
  }

  /**
   * Clears the stored data from the selected storage
   *
   * @public
   */
  async function clearPersistedStorage() {
    await Settings.storageHandler.removeItem(storageName);
  }

  /**
   * Creates the reducer using the default options passed by the user.
   *
   * Extends the default extra reducer builder to update a stored var
   * the tracks the last time the state was updated.
   *
   */
  const reducer = createReducer(initialState, builder => {
    builder.addMatcher(({ type }) => type === `${reducerName}\\${DEFAULT_INIT_ACTION_TYPE}`, (_state, action: PayloadAction<S | null>): void | S => {
      if (action.payload) return action.payload;
    });
    const b = new Builder(builder, UpdatedAtHelper.onStateChange.bind(null, reducerName));
    mapOrBuilderCallback(b);
  });

  /**
   * Adds the listener to any actions and updates the stored
   * data if a change happened.
   *
   * We track all the changes of our state updating a custom
   * attribute saving the time when the change happened.
   */
  startAppListening({
    predicate: (action) => {
      if (action.type === DEFAULT_INIT_ACTION_TYPE) return false;
      return true;
    },
    effect: async (_action, { getState }) => {
      if (!await UpdatedAtHelper.shouldSave(reducerName)) return;
      const state = getState();
      writePersistedStorage(state[reducerName]);
    },
  });

  startAppListening({
    type: `${reducerName}/${DEFAULT_INIT_ACTION_TYPE}`,
    effect: () => {
      UpdatedAtHelper.onStateChange(reducerName);
    },
  });

  return { reducer, reducerName, listenerMiddleware, clearPersistedStorage };
};
