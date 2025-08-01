import { ActionCreatorInvariantMiddlewareOptions, Draft, ImmutableStateInvariantMiddlewareOptions, ListenerMiddlewareInstance, Middleware, SerializableStateInvariantMiddlewareOptions, StoreEnhancer, ThunkMiddleware, Tuple, UnknownAction } from "@reduxjs/toolkit";

/**
 * This is the description of the storage handler used to persist the data
 *
 * @interface StorageHandler
 * @member {function} setItem is used to save the stringified version of the data inot the database
 * @member {function} getItem is used to retrive the stringified version of the data from the database
 * @member {function} removeItem is used to remove the data from the database
 *
 * Available storage could be {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage | localStorage}, {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage | sessionStorage} or {@link https://github.com/react-native-async-storage/async-storage | AsyncStorage}
 *
 */
export interface StorageHandler {
  setItem: (key: string, value: string) => Promise<void> | void;
  getItem: (key: string) => Promise<string | null> | (string | null);
  removeItem: (key: string) => Promise<void> | void;
}

export const DEFAULT_INIT_ACTION_TYPE = '@@INIT-PERSIST';

/**
 * Defaults types not exported by the library.
 */
export type Enhancers = ReadonlyArray<StoreEnhancer>;
export type Middlewares<S> = ReadonlyArray<Middleware<{}, S>>;
export interface ThunkOptions<E = any> {
    extraArgument: E;
}
export interface GetDefaultMiddlewareOptions {
    thunk?: boolean | ThunkOptions;
    immutableCheck?: boolean | ImmutableStateInvariantMiddlewareOptions;
    serializableCheck?: boolean | SerializableStateInvariantMiddlewareOptions;
    actionCreatorCheck?: boolean | ActionCreatorInvariantMiddlewareOptions;
}
export type ThunkMiddlewareFor<S, O extends GetDefaultMiddlewareOptions = {}> = O extends {
    thunk: false;
} ? never : O extends {
    thunk: {
        extraArgument: infer E;
    };
} ? ThunkMiddleware<S, UnknownAction, E> : ThunkMiddleware<S, UnknownAction>;
export type IsAny<T, True, False = never> = true | false extends (T extends never ? true : false) ? True : False;
export type ExtractDispatchFromMiddlewareTuple<MiddlewareTuple extends readonly any[], Acc extends {}> = MiddlewareTuple extends [infer Head, ...infer Tail] ? ExtractDispatchFromMiddlewareTuple<Tail, Acc & (Head extends Middleware<infer D> ? IsAny<D, {}, D> : {})> : Acc;
export type ExtractDispatchExtensions<M> = M extends Tuple<infer MiddlewareTuple> ? ExtractDispatchFromMiddlewareTuple<MiddlewareTuple, {}> : M extends ReadonlyArray<Middleware> ? ExtractDispatchFromMiddlewareTuple<[...M], {}> : never;

/**
 * An *action* is a plain object that represents an intention to change the
 * state. Actions are the only way to get data into the store. Any data,
 * whether from UI events, network callbacks, or other sources such as
 * WebSockets needs to eventually be dispatched as actions.
 *
 * Actions must have a `type` field that indicates the type of action being
 * performed. Types can be defined as constants and imported from another
 * module. These must be strings, as strings are serializable.
 *
 * Other than `type`, the structure of an action object is really up to you.
 * If you're interested, check out Flux Standard Action for recommendations on
 * how actions should be constructed.
 *
 * @template T the type of the action's `type` tag.
 */
type Action<T extends string = string> = {
    type: T;
};

/**
 * A *reducer* is a function that accepts
 * an accumulation and a value and returns a new accumulation. They are used
 * to reduce a collection of values down to a single value
 *
 * Reducers are not unique to Redux—they are a fundamental concept in
 * functional programming.  Even most non-functional languages, like
 * JavaScript, have a built-in API for reducing. In JavaScript, it's
 * `Array.prototype.reduce()`.
 *
 * In Redux, the accumulated value is the state object, and the values being
 * accumulated are actions. Reducers calculate a new state given the previous
 * state and an action. They must be *pure functions*—functions that return
 * the exact same output for given inputs. They should also be free of
 * side-effects. This is what enables exciting features like hot reloading and
 * time travel.
 *
 * Reducers are the most important concept in Redux.
 *
 * *Do not put API calls into reducers.*
 *
 * @template S The type of state consumed and produced by this reducer.
 * @template A The type of actions the reducer can potentially respond to.
 * @template PreloadedState The type of state consumed by this reducer the first time it's called.
 */
type Reducer<S = any, A extends Action = UnknownAction, PreloadedState = S> = (state: S | PreloadedState | undefined, action: A) => S;
/**
 * Object whose values correspond to different reducer functions.
 *
 * @template S The combined state of the reducers.
 * @template A The type of actions the reducers can potentially respond to.
 * @template PreloadedState The combined preloaded state of the reducers.
 */


/**
 * A *case reducer* is a reducer function for a specific action type. Case
 * reducers can be composed to full reducers using `createReducer()`.
 *
 * Unlike a normal Redux reducer, a case reducer is never called with an
 * `undefined` state to determine the initial state. Instead, the initial
 * state is explicitly specified as an argument to `createReducer()`.
 *
 * In addition, a case reducer can choose to mutate the passed-in `state`
 * value directly instead of returning a new state. This does not actually
 * cause the store state to be mutated directly; instead, thanks to
 * [immer](https://github.com/mweststrate/immer), the mutations are
 * translated to copy operations that result in a new state.
 *
 * @public
 */
type CaseReducer<S = any, A extends Action = UnknownAction> = (state: Draft<S>, action: A) => NoInfer<S> | void | Draft<NoInfer<S>>;

export type NotFunction<T> = T extends Function ? never : T;
export type ReducerWithInitialState<S extends NotFunction<any>> = Reducer<S> & {
    getInitialState: () => S;
};
export type PersistedReducer<ReducerName extends String, S extends NotFunction<any>> = {
  reducer: ReducerWithInitialState<S>;
  reducerName: ReducerName;
  listenerMiddleware: ListenerMiddlewareInstance;
  clearPersistedStorage: () => void;
};

interface TypeGuard<T> {
    (value: any): value is T;
}
type TypedActionCreator<Type extends string> = {
    (...args: any[]): Action<Type>;
    type: Type;
};

/**
 * A builder for an action <-> reducer map.
 *
 * @public
 */
export interface ActionReducerMapBuilder<State> {
    /**
     * Adds a case reducer to handle a single exact action type.
     * @remarks
     * All calls to `builder.addCase` must come before any calls to `builder.addMatcher` or `builder.addDefaultCase`.
     * @param actionCreator - Either a plain action type string, or an action creator generated by [`createAction`](./createAction) that can be used to determine the action type.
     * @param reducer - The actual case reducer function.
     */
    addCase<ActionCreator extends TypedActionCreator<string>>(actionCreator: ActionCreator, reducer: CaseReducer<State, ReturnType<ActionCreator>>): ActionReducerMapBuilder<State>;
    /**
     * Adds a case reducer to handle a single exact action type.
     * @remarks
     * All calls to `builder.addCase` must come before any calls to `builder.addMatcher` or `builder.addDefaultCase`.
     * @param actionCreator - Either a plain action type string, or an action creator generated by [`createAction`](./createAction) that can be used to determine the action type.
     * @param reducer - The actual case reducer function.
     */
    addCase<Type extends string, A extends Action<Type>>(type: Type, reducer: CaseReducer<State, A>): ActionReducerMapBuilder<State>;
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
    addMatcher<A>(matcher: TypeGuard<A> | ((action: any) => boolean), reducer: CaseReducer<State, A extends Action ? A : A & Action>): Omit<ActionReducerMapBuilder<State>, 'addCase'>;
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
    addDefaultCase(reducer: CaseReducer<State, Action>): {};
}
