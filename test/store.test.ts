/**
 * @file Test suite for the `configurePersistedStore` function.
 * This file covers the core functionality of store creation, rehydration,
 * and the methods attached to the persisted store instance.
 */

import { createAction } from '@reduxjs/toolkit';
import {
  configurePersistedStore,
  createPersistedReducer,
  createPersistedSlice,
} from '../src';
import { TestSettings } from '../src/settings';
import { StorageHandler } from '../src/types';
import { validateNestedPath } from '../src/utils';
import { flushTimersAndPromises, StorageMock } from './mocks';

describe('configurePersistedStore', () => {
  let storage: StorageHandler;

  beforeEach(() => {
    // Set up a fresh mock storage for each test and use fake timers.
    storage = new StorageMock();
    TestSettings.restoreDefaults();
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Clean up timers after each test.
    jest.useRealTimers();
  });

  describe('Core Functionality', () => {
    it('should persist and rehydrate a persisted slice', async () => {
      // Arrange
      const counterSlice = createPersistedSlice({
        name: 'counter',
        initialState: { value: 0 },
        reducers: {
          increment: (state) => {
            state.value += 1;
          },
        },
      });
      const store = configurePersistedStore(
        { reducer: { [counterSlice.name]: counterSlice.reducer } },
        'testApp',
        storage,
      );
      await flushTimersAndPromises(); // Initial rehydration

      // Act
      store.dispatch(counterSlice.actions.increment());
      await flushTimersAndPromises(); // Debounced save

      // Assert: The state is updated and persisted.
      expect(store.getState().counter.value).toBe(1);
      const persistedState = await storage.getItem('persist:testApp-counter');
      expect(JSON.parse(persistedState!).value).toBe(1);

      // Arrange for rehydration check.
      TestSettings.restoreDefaults();
      TestSettings.subscribeSlice(counterSlice.name)
      const newStore = configurePersistedStore(
        { reducer: { [counterSlice.name]: counterSlice.reducer } },
        'testApp',
        storage,
      );
      await flushTimersAndPromises();

      // Assert: The new store rehydrates to the saved state.
      expect(newStore.getState().counter.value).toBe(1);
    });

    it('should handle a mix of persisted and non-persisted reducers', async () => {
      // Arrange
      const persistedSlice = createPersistedSlice({
        name: 'persisted',
        initialState: { value: 'persisted' },
        reducers: {
          update: (state) => {
            state.value = 'updated';
          },
        },
      });
      const regularReducer = (state = { value: 'regular' }) => state;
      const store = configurePersistedStore(
        {
          reducer: {
            [persistedSlice.name]: persistedSlice.reducer,
            regular: regularReducer,
          },
        },
        'testApp',
        storage,
      );
      await flushTimersAndPromises();

      // Act
      store.dispatch(persistedSlice.actions.update());
      await flushTimersAndPromises();

      // Assert
      const persistedState = await storage.getItem('persist:testApp-persisted');
      expect(JSON.parse(persistedState!).value).toBe('updated');
      const nonPersistedState = await storage.getItem('persist:testApp-regular');
      expect(nonPersistedState).toBeNull();
    });

    it('should correctly handle a persisted reducer at the root', async () => {
      // Arrange
      const incrementAction = createAction('increment');
      const rootCounterReducer = createPersistedReducer(
        'rootCounter',
        { value: 0 },
        (builder) => {
          builder.addCase(incrementAction, (state) => {
            state.value += 1;
          });
        },
        '', // Empty string signifies a root reducer.
      );

      // Act
      const store = configurePersistedStore(
        { reducer: rootCounterReducer },
        'testApp',
        storage,
      );
      await flushTimersAndPromises();
      store.dispatch(incrementAction());
      await flushTimersAndPromises();

      // Assert - Persistence
      expect(store.getState().value).toBe(1);
      const persistedState = await storage.getItem(
        'persist:testApp-rootCounter',
      );
      expect(JSON.parse(persistedState!).value).toBe(1);

      // Assert - Rehydration
      const newStore = configurePersistedStore(
        { reducer: rootCounterReducer },
        'testApp',
        storage,
      );
      await flushTimersAndPromises();
      expect(newStore.getState().value).toBe(1);
    });
  });

  describe('Store Methods and Callbacks', () => {
    it('should call rehydration lifecycle callbacks correctly', async () => {
      // Arrange
      const onRehydrationStart = jest.fn();
      const onRehydrationSuccess = jest.fn();
      const onRehydrationError = jest.fn();
      const counterSlice = createPersistedSlice({
        name: 'counter',
        initialState: { value: 0 },
        reducers: {},
      });

      // Act
      configurePersistedStore(
        { reducer: { [counterSlice.name]: counterSlice.reducer } },
        'testApp',
        storage,
        { onRehydrationStart, onRehydrationSuccess, onRehydrationError },
      );
      await flushTimersAndPromises();

      // Assert
      expect(onRehydrationStart).toHaveBeenCalledTimes(1);
      expect(onRehydrationSuccess).toHaveBeenCalledTimes(1);
      expect(onRehydrationError).not.toHaveBeenCalled();
    });

    it('should call onRehydrationError on timeout', async () => {
      // Arrange
      const onRehydrationError = jest.fn();
      storage.getItem = jest.fn(
        () => new Promise(() => {}),
      ); // Promise that never resolves
      const counterSlice = createPersistedSlice({
        name: 'counter',
        initialState: { value: 0 },
        reducers: {},
      });

      // Act
      configurePersistedStore(
        { reducer: { [counterSlice.name]: counterSlice.reducer } },
        'testApp',
        storage,
        { onRehydrationError, rehydrationTimeout: 100 },
      );
      await jest.advanceTimersByTimeAsync(150);

      // Assert
      expect(onRehydrationError).toHaveBeenCalledWith(
        expect.any(Error),
      );
    });

    it('should manually rehydrate the store when rehydrate() is called', async () => {
      // Arrange
      const counterSlice = createPersistedSlice({
        name: 'counter',
        initialState: { value: 0 },
        reducers: {},
      });
      const store = configurePersistedStore(
        { reducer: { [counterSlice.name]: counterSlice.reducer } },
        'testApp',
        storage,
      );
      await flushTimersAndPromises();
      await storage.setItem('persist:testApp-counter', '{"value": 50}');

      // Act
      await store.rehydrate();
      await flushTimersAndPromises();

      // Assert
      expect(store.getState().counter.value).toBe(50);
    });

    it('should clear persisted state when clearPersistedState() is called', async () => {
      // Arrange
      const counterSlice = createPersistedSlice({
        name: 'counter',
        initialState: { value: 0 },
        reducers: {
          increment: (state) => {
            state.value += 1;
          },
        },
      });
      const store = configurePersistedStore(
        { reducer: { [counterSlice.name]: counterSlice.reducer } },
        'testApp',
        storage,
      );
      await flushTimersAndPromises();
      store.dispatch(counterSlice.actions.increment());
      await flushTimersAndPromises();
      expect(
        await storage.getItem('persist:testApp-counter'),
      ).not.toBeNull();

      // Act
      await store.clearPersistedState();

      // Assert
      expect(await storage.getItem('persist:testApp-counter')).toBeNull();
    });
  });

  describe('Type Validation', () => {
    it('should correctly validate nested paths at compile time', () => {
      // This test serves as a compile-time check. If it compiles, it passes.
      type NestedState = {
        level1: { level2: { sliceA: { value: string } } };
        sliceB: { value: string };
      };

      const sliceA = createPersistedSlice(
        { name: 'sliceA', initialState: { value: 'a' }, reducers: {} },
        'level1.level2.sliceA',
      );

      // This should compile without errors.
      validateNestedPath<NestedState>(sliceA.nestedPath);

      // This would cause a TypeScript error:
      // validateNestedPath<NestedState>('level1.sliceA');

      expect(true).toBe(true);
    });
  });
});
