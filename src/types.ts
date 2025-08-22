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
  UnknownAction,
} from '@reduxjs/toolkit';

/**
 * Defines the interface for a storage handler, allowing `rtk-persist` to
 * work with different storage mechanisms like web `localStorage` or React
 * Native's `AsyncStorage`.
 *
 * @example
 * // For web environments:
 * const storage: StorageHandler = localStorage;
 *
 * // For React Native:
 * import AsyncStorage from '@react-native-async-storage/async-storage';
 * const storage: StorageHandler = AsyncStorage;
 * @public
 */
export interface StorageHandler {
  /** Saves a key-value pair to the storage. */
  setItem: (key: string, value: string) => Promise<void> | void;
  /** Retrieves a value from storage by its key. */
  getItem: (key: string) => Promise<string | null> | string | null;
  /** Removes a key-value pair from storage. */
  removeItem: (key: string) => Promise<void> | void;
}

/**
 * Defines the shape of the payload for the internal `REHYDRATE` action.
 * It's a record where keys are slice names and values are their persisted states.
 * @internal
 */
export type RehydrateActionPayload<
  Name extends string = string,
  State = unknown,
> = Record<Name, State> | null;

// --- Internal RTK Types ---
// These types are re-exported or re-defined from Redux Toolkit to ensure
// proper type inference in `configurePersistedStore`. They are not intended
// for direct use.

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
export type ThunkMiddlewareFor<
  S,
  O extends GetDefaultMiddlewareOptions = {},
> = O extends {
  thunk: false;
}
  ? never
  : O extends {
      thunk: {
        extraArgument: infer E;
      };
    }
  ? ThunkMiddleware<S, UnknownAction, E>
  : ThunkMiddleware<S, UnknownAction>;
/** @internal */
export type IsAny<T, True, False = never> = true | false extends (
  T extends never ? true : false
)
  ? True
  : False;
/** @internal */
export type ExtractDispatchFromMiddlewareTuple<
  MiddlewareTuple extends readonly any[],
  Acc extends {},
> = MiddlewareTuple extends [infer Head, ...infer Tail]
  ? ExtractDispatchFromMiddlewareTuple<
      Tail,
      Acc & (Head extends Middleware<infer D> ? IsAny<D, {}, D> : {})
    >
  : Acc;
/** @internal */
export type ExtractDispatchExtensions<M> = M extends Tuple<infer MiddlewareTuple>
  ? ExtractDispatchFromMiddlewareTuple<MiddlewareTuple, {}>
  : M extends ReadonlyArray<Middleware>
  ? ExtractDispatchFromMiddlewareTuple<[...M], {}>
  : never;

/**
 * A utility type to ensure a value is not a function, used to constrain
 * state types to be serializable.
 * @internal
 */
export type NotFunction<T> = T extends Function ? never : T;

/**
 * A utility type that defines a valid nesting path for a persisted slice or reducer.
 * The path must be a dot-notation string that ends with the slice/reducer's name.
 * An empty string is also valid for root-level items.
 *
 * @template Path - The name or path of the reducer, which must be the final segment.
 */
export type NestedPath<Path extends string> = '' | Path | `${string}.${Path}`;

/**
 * An enhanced Redux reducer that includes properties for persistence management.
 * @public
 */
export type PersistedReducer<
  S extends NotFunction<any>,
  ReducerName extends string,
  Nesting extends NestedPath<ReducerName> = ReducerName,
> = Reducer<S> & {
  /** The unique name of the reducer, used as the storage key. */
  reducerName: ReducerName;
  /** The full dot-separated path to the reducer's state in the root state object. */
  nestedPath: Nesting;
};

/**
 * An enhanced Redux slice that includes the `nestedPath` property for
 * tracking its location within the root state.
 * @public
 */
export type PersistedSlice<
  SliceState,
  PCR extends SliceCaseReducers<SliceState>,
  Name extends string,
  ReducerPath extends string,
  PersistedSelectors extends SliceSelectors<SliceState>,
  Nesting extends NestedPath<Name | ReducerPath> = ReducerPath,
> = Slice<SliceState, PCR, Name, ReducerPath, PersistedSelectors> & {
  /** The full dot-separated path to the slice's state in the root state object. */
  nestedPath: Nesting;
};

/**
 * The enhanced store object returned by `configurePersistedStore`.
 * It includes the standard Redux store methods, plus additional methods
 * for controlling the persistence lifecycle.
 * @public
 */
export type PersistedStore<
  S extends Record<string, unknown> = any,
  A extends Action = UnknownAction,
  M extends Tuple<Middlewares<S>> = Tuple<[ThunkMiddlewareFor<S>]>,
  E extends Tuple<Enhancers> = Tuple<
    [
      StoreEnhancer<{
        dispatch: ExtractDispatchExtensions<M>;
      }>,
      StoreEnhancer,
    ]
  >,
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
};

/**
 * Defines configuration options for the persistence and rehydration process.
 * @public
 */
export interface PersistenceOptions {
  /** The maximum time in milliseconds to wait for rehydration before timing out. Defaults to 5000. */
  rehydrationTimeout?: number;
  /** An optional callback invoked when the rehydration process begins. */
  onRehydrationStart?: () => void;
  /** An optional callback invoked when rehydration completes successfully. */
  onRehydrationSuccess?: () => void;
  /** An optional callback invoked if an error occurs during rehydration. */
  onRehydrationError?: (error: unknown) => void;
}
