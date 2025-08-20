import {
  Action,
  ActionCreatorInvariantMiddlewareOptions,
  EnhancedStore,
  ImmutableStateInvariantMiddlewareOptions,
  Middleware,
  Reducer,
  SerializableStateInvariantMiddlewareOptions,
  StoreEnhancer,
  ThunkMiddleware,
  Tuple,
  UnknownAction
} from "@reduxjs/toolkit";

/**
 * Defines the interface for a storage handler used to persist data.
 *
 * @interface StorageHandler
 * @public
 * @example
 * // For web
 * const storage = localStorage;
 *
 * // For React Native
 * import AsyncStorage from '@react-native-async-storage/async-storage';
 * const storage = AsyncStorage;
 */
export interface StorageHandler {
  /** Saves a string value to storage for a given key. */
  setItem: (key: string, value: string) => Promise<void> | void;
  /** Retrieves a string value from storage for a given key. */
  getItem: (key: string) => Promise<string | null> | (string | null);
  /** Removes a value from storage for a given key. */
  removeItem: (key: string) => Promise<void> | void;
}

export type RehydrateActionPayload<Name extends string = string, State = unknown> = Record<Name, State> | null;

// --- Internal RTK Types ---
// These types are re-exported or re-defined from Redux Toolkit's internal
// types to ensure proper type inference in `configurePersistedStore`.
// They are not intended for direct use by end-users.

/** @internal */
export type Enhancers = ReadonlyArray<StoreEnhancer>;
/** @internal */
export type Middlewares<S> = ReadonlyArray<Middleware<{}, S>>;
/** @internal */
export interface ThunkOptions<E = any> {
    extraArgument: E;
}
/** @internal */
export interface GetDefaultMiddlewareOptions {
    thunk?: boolean | ThunkOptions;
    immutableCheck?: boolean | ImmutableStateInvariantMiddlewareOptions;
    serializableCheck?: boolean | SerializableStateInvariantMiddlewareOptions;
    actionCreatorCheck?: boolean | ActionCreatorInvariantMiddlewareOptions;
}
/** @internal */
export type ThunkMiddlewareFor<S, O extends GetDefaultMiddlewareOptions = {}> = O extends {
    thunk: false;
} ? never : O extends {
    thunk: {
        extraArgument: infer E;
    };
} ? ThunkMiddleware<S, UnknownAction, E> : ThunkMiddleware<S, UnknownAction>;
/** @internal */
export type IsAny<T, True, False = never> = true | false extends (T extends never ? true : false) ? True : False;
/** @internal */
export type ExtractDispatchFromMiddlewareTuple<MiddlewareTuple extends readonly any[], Acc extends {}> = MiddlewareTuple extends [infer Head, ...infer Tail] ? ExtractDispatchFromMiddlewareTuple<Tail, Acc & (Head extends Middleware<infer D> ? IsAny<D, {}, D> : {})> : Acc;
/** @internal */
export type ExtractDispatchExtensions<M> = M extends Tuple<infer MiddlewareTuple> ? ExtractDispatchFromMiddlewareTuple<MiddlewareTuple, {}> : M extends ReadonlyArray<Middleware> ? ExtractDispatchFromMiddlewareTuple<[...M], {}> : never;

/**
 * A utility type that ensures a value is not a function.
 * @internal
 */
export type NotFunction<T> = T extends Function ? never : T;

/**
 * A utility type that enhances a Redux reducer with a `getInitialState` method.
 * @internal
 */
export type ReducerWithInitialState<S extends NotFunction<any>> = Reducer<S> & {
  getInitialState: () => S;
};

/**
 * The enhanced store type returned by `configurePersistedStore`.
 * It includes the standard Redux store properties and methods, plus
 * additional methods for managing persistence.
 * @internal
 */
export type PersistedStore<
  S extends Record<string, unknown> = any,
  A extends Action = UnknownAction,
  M extends Tuple<Middlewares<S>> = Tuple<[ThunkMiddlewareFor<S>]>,
  E extends Tuple<Enhancers> = Tuple<[
    StoreEnhancer<{
      dispatch: ExtractDispatchExtensions<M>;
    }>,
    StoreEnhancer
  ]>
> = EnhancedStore<S, A, E> & {
  /** Manually rehydrates the store from storage. */
  rehydrate: () => Promise<void>;
  /** Clears the persisted state. */
  clearPersistedState: () => void;
}
