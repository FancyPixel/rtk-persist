import { createContext, useContext } from 'react';
import { PersistedStore } from '../../core/types';

/**
 * Defines the shape of the context value provided by `PersistedStoreContext`.
 */
interface PersistedStoreContextValue {
  /**
   * The rehydrated `PersistedStore` instance.
   */
  store: PersistedStore;
}

/**
 * A React Context that provides the `PersistedStore` instance to its
 * descendant components. This is used internally by the `PersistedProvider`.
 */
export const PersistedStoreContext = createContext<PersistedStoreContextValue>({
  store: {} as PersistedStore
});

/**
 * A custom React hook that provides convenient access to the `PersistedStore` instance.
 *
 * This hook must be called from a component that is a descendant of the `<PersistedProvider />`.
 * It allows components to interact directly with the persisted store, for example, to
 * manually trigger a save by calling the `flush` method.
 *
 * @example
 * ```tsx
 * import React from 'react';
 * import { usePersistedStore } from 'rtk-persist';
 *
 * const MyComponent = () => {
 * const { store } = usePersistedStore();
 *
 * const handleSaveNow = () => {
 * // Manually forces the store to save its current state to storage.
 * store.flush();
 * };
 *
 * return <button onClick={handleSaveNow}>Save Now</button>;
 * };
 * ```
 *
 * @returns The persisted store context value, containing the store instance.
 * @throws Will throw an error if the hook is used outside of a `<PersistedProvider />`.
 */
export const usePersistedStore = (): PersistedStoreContextValue => {
  const context = useContext(PersistedStoreContext);
  if (context === undefined || !context.store) {
    throw new Error('usePersistedStore must be used within a PersistedProvider');
  }
  return context;
};
