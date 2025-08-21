import {
  Action,
  ActionCreatorInvariantMiddlewareOptions,
  EnhancedStore,
  ImmutableStateInvariantMiddlewareOptions,
  Middleware,
  Reducer,
  SerializableStateInvariantMiddlewareOptions,
  Slice,
  SliceCaseReducers,
  SliceSelectors,
  StoreEnhancer,
  ThunkMiddleware,
  Tuple,
  UnknownAction
} from "@reduxjs/toolkit";

/**
 * Defines the interface for a storage handler used to persist data.
 * This allows for a flexible storage mechanism, whether it's `localStorage`
 * in the browser or `AsyncStorage` in React Native.
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

/**
 * Defines the shape of the payload for the internal `REHYDRATE` action.
 * It's a record where keys are slice names and values are their persisted state.
 * @internal
 */
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
 * A utility type that ensures a value is not a function. This is used to
 * constrain state types to be serializable plain objects.
 * @internal
 */
export type NotFunction<T> = T extends Function ? never : T;

/**
 * A conditional type that constructs the full dot-notation path for a nested slice or reducer.
 * If `Nesting` is undefined or an empty string, it returns the `ReducerPath` directly.
 * Otherwise, it prepends the nesting path.
 *
 * @internal
 */
export type NestedPath<
  ReducerPath extends string,
  Nesting extends string | undefined
> = Nesting extends '' | undefined
    ? ReducerPath
    : `${NonNullable<Nesting>}.${ReducerPath}`

/**
 * A utility type that enhances a Redux reducer with properties needed for persistence.
 * It adds `reducerName` and the calculated `nestedPath` to the standard reducer type.
 * @internal
 */
export type PersistedReducer<
  S extends NotFunction<any>,
  ReducerName extends string,
  Nesting extends string | undefined
> = Reducer<S> & {
  reducerName: ReducerName;
  nestedPath: NestedPath<ReducerName, Nesting>;
};

/**
 * A utility type that enhances a Redux slice with the `nestedPath` property,
 * which represents its full path within the root state.
 *
 * @internal
 */
export type PersistedSlice<
  SliceState,
  PCR extends SliceCaseReducers<SliceState>,
  Name extends string,
  ReducerPath extends string,
  PeristedSelectors extends SliceSelectors<SliceState>,
  Nesting extends string | undefined
> = Slice<SliceState, PCR, Name, ReducerPath, PeristedSelectors> & {
  nestedPath: NestedPath<ReducerPath, Nesting>;
};

/**
 * The enhanced store type returned by `configurePersistedStore`.
 * It includes the standard Redux store properties and methods, plus
 * additional methods for managing persistence.
 * @public
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
  /**
   * Manually triggers the rehydration of the store's state from storage.
   * @returns A promise that resolves when rehydration is complete.
   */
  rehydrate: () => Promise<void>;
  /**
   * Clears all persisted state for the application from storage.
   * @returns A promise that resolves when the state has been cleared.
   */
  clearPersistedState: () => Promise<void>;
}

/**
 * Defines the configuration options for the persistence behavior.
 * @interface PersistenceOptions
 * @public
 */
export interface PersistenceOptions {
  /** The maximum time in milliseconds to wait for rehydration to complete before timing out. Defaults to 5000. */
  rehydrationTimeout?: number;
  /** A callback invoked when the rehydration process begins. */
  onRehydrationStart?: () => void;
  /** A callback invoked when the rehydration process completes successfully. */
  onRehydrationSuccess?: () => void;
  /** A callback invoked if an error occurs during rehydration. */
  onRehydrationError?: (error: unknown) => void;
}
