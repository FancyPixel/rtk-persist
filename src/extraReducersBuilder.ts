import { ActionReducerMapBuilder, CaseReducer, Action, Draft } from "@reduxjs/toolkit";

/**
 * Extension of a reducer that invokes a callback every time
 * this specific reducer is called.
 *
 * @internal
 */
const persistReducer = <SliceState>(r: CaseReducer<SliceState, Action>, onStateUpdate: () => void) => (s: Draft<SliceState>, a: Action): void | SliceState | Draft<SliceState> => {
  const ns = r(s, a);
  onStateUpdate();
  if (ns) return ns;
};

/**
 * A builder for an action <-> reducer map updating the attribute
 * sliceStorageLastUpdateAt whenever the state is changed.
 *
 * @param builder The builder of the extraReducers
 * @param onStateUpdate The callback to invoke when the state is changed
 *
 * @public
 */
export class Builder<SliceState> implements ActionReducerMapBuilder<SliceState>
{
  builder: ActionReducerMapBuilder<SliceState>;
  onStateUpdate: () => void;
  constructor(
    builder: ActionReducerMapBuilder<SliceState>,
    onStateUpdate: () => void,
  ) {
    this.builder = builder;
    this.onStateUpdate = onStateUpdate;
  }

  /**
     * Adds a "default case" reducer that is executed if no case reducer and no matcher
     * reducer was executed for this action.
     * @param reducer - The fallback "default case" reducer function.
     *
     * @example
  ```ts
  import { createReducer } from '@reduxjs/toolkit'
  const initialState = { otherActions: 0 }
  const reducer = createReducer(initialState, builder => {
    builder
      // .addCase(...)
      // .addMatcher(...)
      .addDefaultCase((state, action) => {
        state.otherActions++
      })
  })
  ```
     */
  addDefaultCase(r: CaseReducer<SliceState, Action>) {
    this.builder.addDefaultCase(persistReducer(r, this.onStateUpdate));
    return this;
  }

  /**
   * Allows you to match your incoming actions against your own filter function instead of only the `action.type` property.
   * @remarks
   * If multiple matcher reducers match, all of them will be executed in the order
   * they were defined in - even if a case reducer already matched.
   * All calls to `builder.addMatcher` must come after any calls to `builder.addCase` and before any calls to `builder.addDefaultCase`.
   * @param matcher - A matcher function. In TypeScript, this should be a [type predicate](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates)
   *   function
   * @param reducer - The actual case reducer function.
   *
   * @example
  ```ts
  import {
    createAction,
    createReducer,
    AsyncThunk,
    UnknownAction,
  } from "@reduxjs/toolkit";

  type GenericAsyncThunk = AsyncThunk<unknown, unknown, any>;

  type PendingAction = ReturnType<GenericAsyncThunk["pending"]>;
  type RejectedAction = ReturnType<GenericAsyncThunk["rejected"]>;
  type FulfilledAction = ReturnType<GenericAsyncThunk["fulfilled"]>;

  const initialState: Record<string, string> = {};
  const resetAction = createAction("reset-tracked-loading-state");

  function isPendingAction(action: UnknownAction): action is PendingAction {
    return typeof action.type === "string" && action.type.endsWith("/pending");
  }

  const reducer = createReducer(initialState, (builder) => {
    builder
      .addCase(resetAction, () => initialState)
      // matcher can be defined outside as a type predicate function
      .addMatcher(isPendingAction, (state, action) => {
        state[action.meta.requestId] = "pending";
      })
      .addMatcher(
        // matcher can be defined inline as a type predicate function
        (action): action is RejectedAction => action.type.endsWith("/rejected"),
        (state, action) => {
          state[action.meta.requestId] = "rejected";
        }
      )
      // matcher can just return boolean and the matcher can receive a generic argument
      .addMatcher<FulfilledAction>(
        (action) => action.type.endsWith("/fulfilled"),
        (state, action) => {
          state[action.meta.requestId] = "fulfilled";
        }
      );
  });
  ```
     */
  addMatcher(p: any, r: CaseReducer<SliceState, any>) {
    this.builder.addMatcher(p, persistReducer(r, this.onStateUpdate));
    return this;
  }

  /**
   * Adds a case reducer to handle a single exact action type.
   * @remarks
   * All calls to `builder.addCase` must come before any calls to `builder.addMatcher` or `builder.addDefaultCase`.
   * @param actionCreator - Either a plain action type string, or an action creator generated by [`createAction`](./createAction) that can be used to determine the action type.
   * @param reducer - The actual case reducer function.
   */
  addCase(ac: string, r: CaseReducer<SliceState, any>) {
    this.builder.addCase(ac, persistReducer(r, this.onStateUpdate));
    return this;
  }
}