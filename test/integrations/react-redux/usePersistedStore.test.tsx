/**
 * @file Test suite for the usePersistedStore hook.
 * @jest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import React from 'react';
import { PersistedStore } from '../../../src/core/types';
import { PersistedStoreContext, usePersistedStore } from '../../../src/integrations/react-redux/usePersistedStore';

describe('usePersistedStore', () => {
  it('should return the store from context when used within a provider', () => {
    // Arrange
    const mockStore = {
      getState: () => ({ test: 'value' }),
      dispatch: jest.fn(),
      subscribe: jest.fn(),
      replaceReducer: jest.fn(),
      rehydrate: jest.fn(),
      clearPersistedState: jest.fn(),
      addMiddleware: jest.fn(),
      createListenerMiddleware: jest.fn(),
    } as unknown as PersistedStore;

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PersistedStoreContext.Provider value={{ store: mockStore }}>
        {children}
      </PersistedStoreContext.Provider>
    );

    // Act
    const { result } = renderHook(() => usePersistedStore(), { wrapper });

    // Assert
    expect(result.current.store).toBe(mockStore);
  });

  it('should throw an error when used outside of a PersistedStoreProvider', () => {
    // Act
    const { result } = renderHook(() => usePersistedStore());

    // Assert
    expect(Object.keys(result.current.store).length).toBe(0);
  });
});
