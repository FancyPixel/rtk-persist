import { Action, UnknownAction } from "@reduxjs/toolkit";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { Provider, ProviderProps } from "react-redux";
import { PersistedStore } from "../../core/types";
import { PersistedStoreContext } from "./usePersistedStore";

/**
 * Props for the PersistedProvider component.
 * @template S The type of state managed by the store.
 * @template A The type of actions that can be dispatched.
 */
interface Props<A extends Action<string> = UnknownAction, S extends Record<string, unknown> = any> extends Omit<ProviderProps<A, S>, 'store'> {
  /**
   * A promise that resolves to the persisted Redux store.
   * This is typically the result of calling `createPersistedStore`.
   */
  store: Promise<PersistedStore<S, A>>;
  /**
   * An optional React node to display while the store is rehydrating.
   * If not provided, nothing will be rendered during rehydration.
   */
  loader?: ReactNode;
}

/**
 * A React Provider component that waits for the Redux store to be rehydrated
 * from storage before rendering its children. It seamlessly integrates with
 * `react-redux`.
 *
 * It should be used at the root of your application instead of the standard
 * `Provider` from `react-redux`.
 *
 * @example
 * ```tsx
 * import React from 'react';
 * import ReactDOM from 'react-dom/client';
 * import App from './App';
 * import { PersistedProvider } from 'rtk-persist/integrations/react-redux';
 * import { store } from './state/store'; // This is the promise from createPersistedStore
 *
 * ReactDOM.createRoot(document.getElementById('root')!).render(
 * <React.StrictMode>
 * <PersistedProvider store={store} loader={<div>Loading...</div>}>
 * <App />
 * </PersistedProvider>
 * </React.StrictMode>,
 * );
 * ```
 *
 * @param props The component props.
 * @see Props
 */
export default function PersistedProvider(props: Props) {
  const { loader, store, ...rest } = props;
  const [hydratedStore, setHydratedStore] = useState<PersistedStore | null>(null);

  // Effect to await the resolution of the store promise on component mount.
  useEffect(() => {
    const onMount = async () => {
      if (!store) return;
      setHydratedStore(await store);
    }
    onMount();
  }, [store]);

  // Memoize the context value to prevent unnecessary re-renders.
  const contextValue = useMemo(() => ({ store: hydratedStore! }), [hydratedStore]);

  // While the store is being rehydrated, render the loader or nothing.
  if (!hydratedStore) {
    return loader || null;
  }

  // Once hydrated, provide the store to the rest of the application.
  return (
    <PersistedStoreContext.Provider value={contextValue}>
      <Provider store={hydratedStore} {...rest} />
    </PersistedStoreContext.Provider>
  )
}
