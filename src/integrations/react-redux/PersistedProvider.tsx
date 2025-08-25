import { Action, UnknownAction } from "@reduxjs/toolkit";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { Provider, ProviderProps } from "react-redux";
import { PersistedStore } from "../../core/types";
import { PersistedStoreContext } from "./usePersistedStore";

interface Props<A extends Action<string> = UnknownAction, S extends Record<string, unknown> = any> extends Omit<ProviderProps<A, S>, 'store'> {
  store: Promise<PersistedStore<S, A>>;
  loader?: ReactNode;
}

export default function PersistedProvider(props: Props) {
  const { loader, store, ...rest } = props;
  const [hydratedStore, setHydratedStore] = useState<PersistedStore | null>(null);

  const onMount = async () => {
    if (!store) return;
    setHydratedStore(await store);
  }
  useEffect(() => {
    onMount();
  }, [store]);

  const contextValue = useMemo(() => ({ store: hydratedStore! }), [hydratedStore]);

  if (!hydratedStore) return loader || null;

  return (
    <PersistedStoreContext.Provider value={contextValue}>
      <Provider store={hydratedStore} {...rest} />
    </PersistedStoreContext.Provider>
  )
}
