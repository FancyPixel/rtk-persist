import {
  Action,
  ActionReducerMapBuilder,
  CaseReducer,
  Draft,
} from '@reduxjs/toolkit';

/**
 * A higher-order reducer that wraps a case reducer and invokes a callback
 * every time the reducer is executed. This is the core mechanism for tracking
 * state changes that need to be persisted.
 * @param r - The original case reducer function.
 * @param onStateUpdate - The callback invoked after the original reducer. It receives the potentially mutated state draft and the action.
 * @returns The wrapped case reducer.
 * @internal
 */
const persistReducer =
  <SliceState>(
    r: CaseReducer<SliceState, Action>,
    onStateUpdate: (s: Draft<SliceState>, a: Action) => void,
  ) =>
  (
    s: Draft<SliceState>,
    a: Action,
  ): void | SliceState | Draft<SliceState> => {
    const ns = r(s, a);
    onStateUpdate(s, a);
    if (ns) return ns;
  };

/**
 * A proxy for the `ActionReducerMapBuilder` that intercepts calls to `addCase`,
 * `addMatcher`, and `addDefaultCase`. It wraps the provided reducers with
 * persistence logic, ensuring that the `onStateUpdate` callback is triggered
 * after any state change.
 *
 * @param builder The original `ActionReducerMapBuilder` from Redux Toolkit.
 * @param onStateUpdate The callback to invoke after any case reducer has been
 * executed. It receives the state draft and the action.
 * @internal
 */
export class Builder<SliceState>
  implements ActionReducerMapBuilder<SliceState>
{
  builder: ActionReducerMapBuilder<SliceState>;
  onStateUpdate: (s: Draft<SliceState>, a: Action) => void;

  /**
   * Creates an instance of the persistence-aware builder.
   * @param builder The original `ActionReducerMapBuilder`.
   * @param onStateUpdate The callback to invoke when the state is updated by any of the reducers.
   */
  constructor(
    builder: ActionReducerMapBuilder<SliceState>,
    onStateUpdate: (s: Draft<SliceState>, a: Action) => void,
  ) {
    this.builder = builder;
    this.onStateUpdate = onStateUpdate;
  }

  /**
   * Wraps and adds a "default case" reducer. This behaves like the
   * original `builder.addDefaultCase` but also triggers the persistence
   * callback upon execution.
   * @param reducer - The fallback "default case" reducer function.
   */
  addDefaultCase(r: CaseReducer<SliceState, Action>) {
    this.builder.addDefaultCase(persistReducer(r, this.onStateUpdate));
    return this;
  }

  /**
   * Wraps and adds a matcher reducer. This behaves like the original
   * `builder.addMatcher` but also triggers the persistence callback
   * upon execution.
   * @param matcher - A matcher function to filter actions.
   * @param reducer - The actual case reducer function.
   */
  addMatcher(p: any, r: CaseReducer<SliceState, any>) {
    this.builder.addMatcher(p, persistReducer(r, this.onStateUpdate));
    return this;
  }

  /**
   * Wraps and adds a case reducer to handle a single action type. This
   * behaves like the original `builder.addCase` but also triggers the
   * persistence callback upon execution.
   * @param actionCreator - The action creator or type string to match against.
   * @param reducer - The actual case reducer function.
   */
  addCase(ac: string, r: CaseReducer<SliceState, any>) {
    this.builder.addCase(ac, persistReducer(r, this.onStateUpdate));
    return this;
  }
}
