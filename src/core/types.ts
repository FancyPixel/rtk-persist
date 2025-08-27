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
 * Defines the interface for a storage handler, enabling `rtk-persist` to
 * integrate with various storage mechanisms like web `localStorage` or
 * React Native's `AsyncStorage`.
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
  /** * Saves a key-value pair to the storage.
   * @param key - The key under which to store the value.
   * @param value - The string value to store.
   */
  setItem: (key: string, value: string) => Promise<void> | void;
  /** * Retrieves a value from storage by its key.
   * @param key - The key of the item to retrieve.
   * @returns A promise resolving to the value, or the value directly, or null if not found.
  */
  getItem: (key: string) => Promise<string | null> | string | null;
  /** * Removes a key-value pair from storage.
   * @param key - The key of the item to remove.
  */
  removeItem: (key: string) => Promise<void> | void;
}

/**
 * Defines the shape of the payload for the internal `REHYDRATE` action.
 * This is a record where keys are slice names and values are their persisted states.
 * @internal
 */
export type RehydrateActionPayload<
  Name extends string = string,
  State = unknown,
> = Record<Name, State> | null;

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
 * A utility type to ensure a value is not a function. This helps constrain
 * state types to be serializable, as functions cannot be persisted.
 * @internal
 */
export type NotFunction<T> = T extends Function ? never : T;

/**
 * Defines a valid nesting path for a persisted slice or reducer.
 * The path is a dot-notation string that must end with the slice/reducer's name.
 * An empty string is also valid for items at the root level of the state.
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
  /** The unique name of the reducer, used as the key in storage. */
  reducerName: ReducerName;
  /** The full dot-separated path to the reducer's state within the root state object. */
  nestedPath: Nesting;
};

/**
 * An enhanced Redux slice that includes the `nestedPath` property for
 * tracking its location within the root state, allowing for persistence of nested state.
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
  /** The full dot-separated path to the slice's state within the root state object. */
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
   * This is useful for scenarios like re-authenticating a user.
   * @returns A promise that resolves when rehydration is complete.
   */
  rehydrate: () => Promise<void>;
  /**
   * Clears all persisted state for this store from the storage engine.
   * @returns A promise that resolves when the state has been cleared.
   */
  clearPersistedState: () => Promise<void>;
};

/**
 * Defines global configuration options for the store's persistence and rehydration process.
 * @public
 */
export interface StorePersistenceOptions {
  /** The maximum time in milliseconds to wait for rehydration before timing out. Defaults to 5000. */
  rehydrationTimeout?: number;
}

/**
 * Defines persistence options for an individual slice, allowing for custom
 * serialization and deserialization logic.
 * @public
 */
export type SlicePersistenceOptions<
  SliceState,
  SavedState,
  Name extends string,
  ReducerPath extends string = Name,
  Nesting extends NestedPath<Name | ReducerPath> = ReducerPath,
> = {
  /**
   * Specifies the dot-notation path to the slice's state if it's nested.
   * If not provided, it's assumed to be at the root.
   */
  nestedPath?: Nesting;
} & ({
  /** A function to transform the slice's state before it's saved to storage. */
  onPersist: (sliceState: SliceState) => SavedState;
  /** A function to transform the saved state back into the slice's state upon rehydration. */
  onRehydrate: (savedState: SavedState) => SliceState;
} | {});

/**
 * Defines persistence options for an individual reducer, allowing for custom
 * serialization and deserialization logic.
 * @public
 */
export type ReducerPersistenceOptions<
  ReducerName extends string,
  S extends NotFunction<any>,
  SavedState,
  Nesting extends NestedPath<ReducerName> = ReducerName,
> = {
  /**
   * Specifies the dot-notation path to the reducer's state if it's nested.
   * If not provided, it's assumed to be at the root.
   */
  nestedPath?: Nesting;
} & ({
  /** A function to transform the reducer's state before it's saved to storage. */
  onPersist: (sliceState: S) => SavedState;
  /** A function to transform the saved state back into the reducer's state upon rehydration. */
  onRehydrate: (savedState: SavedState) => S;
} | {});
