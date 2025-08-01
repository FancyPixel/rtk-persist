import { ActionCreatorInvariantMiddlewareOptions, ImmutableStateInvariantMiddlewareOptions, Middleware, SerializableStateInvariantMiddlewareOptions, StoreEnhancer, ThunkMiddleware, Tuple, UnknownAction } from "@reduxjs/toolkit";

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
