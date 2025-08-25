/**
 * @file Test suite for the `createPersistedSlice` function.
 * This file covers the core functionality of persistence and rehydration,
 * including interactions with own reducers, extra reducers, and nested state.
 */

import { combineReducers, createAction, PayloadAction } from '@reduxjs/toolkit';
import { TestSettings } from '../../src/core/settings';
import { createPersistedSlice } from '../../src/core/slice';
import { configurePersistedStore } from '../../src/core/store';
import { StorageHandler } from '../../src/core/types';
import { flushTimersAndPromises, StorageMock } from './mocks';

describe('createPersistedSlice', () => {
  let storage: StorageHandler;

  beforeEach(() => {
    // Set up a fresh mock storage and use fake timers for debounce control.
    storage = new StorageMock();
    TestSettings.restoreDefaults();
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Clean up timers after each test.
    jest.useRealTimers();
  });

  describe('Persistence Logic', () => {
    it('should persist state changes from its own reducers', async () => {
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
      const store = await configurePersistedStore(
        { reducer: { [counterSlice.name]: counterSlice.reducer } },
        'testApp',
        storage,
      );
      await flushTimersAndPromises(); // Allow initial rehydration

      // Act
      store.dispatch(counterSlice.actions.increment());
      store.dispatch(counterSlice.actions.increment());
      await flushTimersAndPromises(); // Allow debounce to complete

      // Assert
      expect(store.getState().counter.value).toBe(2);
      const persistedState = await storage.getItem('persist:testApp-counter');
      expect(JSON.parse(persistedState!).value).toBe(2);
    });

    it('should persist state changes from extraReducers', async () => {
      // Arrange
      const externalAction = createAction('external/action');
      const counterSlice = createPersistedSlice({
        name: 'counter',
        initialState: { value: 0 },
        reducers: {},
        extraReducers: (builder) => {
          builder.addCase(externalAction, (state) => {
            state.value = 100;
          });
        },
      });
      const store = await configurePersistedStore(
        { reducer: { [counterSlice.name]: counterSlice.reducer } },
        'testApp',
        storage,
      );
      await flushTimersAndPromises();

      // Act
      store.dispatch(externalAction());
      await flushTimersAndPromises();

      // Assert
      const persistedState = await storage.getItem('persist:testApp-counter');
      expect(store.getState().counter.value).toBe(100);
      expect(JSON.parse(persistedState!).value).toBe(100);
    });

    it('should not persist state if an action does not cause a change', async () => {
      // Arrange
      const externalAction = createAction('external/action');
      const counterSlice = createPersistedSlice({
        name: 'counter',
        initialState: { value: 0 },
        reducers: {}, // This slice does not handle the action.
      });
      const store = await configurePersistedStore(
        { reducer: { [counterSlice.name]: counterSlice.reducer } },
        'testApp',
        storage,
      );
      const setItemSpy = jest.spyOn(storage, 'setItem');
      await flushTimersAndPromises();

      // Act
      store.dispatch(externalAction());
      await flushTimersAndPromises();

      // Assert
      expect(setItemSpy).not.toHaveBeenCalledWith(expect.anything(), counterSlice.name);
    });
  });

  describe('Rehydration Logic', () => {
    it('should rehydrate state from storage on startup', async () => {
      // Arrange: Pre-seed storage with data.
      await storage.setItem('persist:testApp-counter', '{"value": 10}');
      const counterSlice = createPersistedSlice({
        name: 'counter',
        initialState: { value: 0 },
        reducers: {},
      });

      // Act: Configure the store, which triggers rehydration.
      const store = await configurePersistedStore(
        { reducer: { [counterSlice.name]: counterSlice.reducer } },
        'testApp',
        storage,
      );
      await flushTimersAndPromises(); // Wait for rehydration

      // Assert: The store's state should match the persisted value.
      expect(store.getState().counter.value).toBe(10);
    });

    it('should use the initial state if storage is empty', async () => {
      // Arrange
      const counterSlice = createPersistedSlice({
        name: 'counter',
        initialState: { value: 5 },
        reducers: {},
      });

      // Act
      const store = await configurePersistedStore(
        { reducer: { [counterSlice.name]: counterSlice.reducer } },
        'testApp',
        storage,
      );
      await flushTimersAndPromises();

      // Assert
      expect(store.getState().counter.value).toBe(5);
    });

    it('should fall back to initial state if persisted data is corrupted', async () => {
      // Arrange: Put invalid JSON into storage.
      await storage.setItem('persist:testApp-counter', '{"value": corrupted}');
      const counterSlice = createPersistedSlice({
        name: 'counter',
        initialState: { value: 0 },
        reducers: {},
      });

      // Act
      const store = await configurePersistedStore(
        { reducer: { [counterSlice.name]: counterSlice.reducer } },
        'testApp',
        storage,
      );
      await flushTimersAndPromises();

      // Assert
      expect(store.getState().counter.value).toBe(0);
    });
  });

  describe('Nesting and Path Handling', () => {
    it('should correctly persist and rehydrate a nested slice', async () => {
      // Arrange
      const sliceA = createPersistedSlice({
        name: 'sliceA',
        initialState: { value: 'a' },
        reducers: {
          update: (state, action: PayloadAction<string>) => {
            state.value = action.payload;
          },
        },
      });
      const sliceB = createPersistedSlice(
        {
          name: 'sliceB',
          initialState: { value: 'b' },
          reducers: {
            update: (state, action: PayloadAction<string>) => {
              state.value = action.payload;
            },
          },
        },
        'nested.sliceB',
      );
      const nestedReducer = combineReducers({ [sliceB.name]: sliceB.reducer });
      const store = await configurePersistedStore(
        {
          reducer: { [sliceA.name]: sliceA.reducer, nested: nestedReducer },
        },
        'testApp',
        storage,
      );
      await flushTimersAndPromises();

      // Assert: Check path inference.
      expect(sliceA.nestedPath).toBe('sliceA');
      expect(sliceB.nestedPath).toBe('nested.sliceB');

      // Act: Dispatch actions and persist.
      store.dispatch(sliceA.actions.update('newA'));
      store.dispatch(sliceB.actions.update('newB'));
      await flushTimersAndPromises();

      // Assert: Both slices are persisted correctly.
      const itemA = await storage.getItem('persist:testApp-sliceA');
      const itemB = await storage.getItem('persist:testApp-sliceB');
      expect(JSON.parse(itemA!).value).toBe('newA');
      expect(JSON.parse(itemB!).value).toBe('newB');

      // Arrange for rehydration.
      TestSettings.restoreDefaults();
      TestSettings.subscribeSlice(sliceA.name);
      TestSettings.subscribeSlice(sliceB.name);

      const newStore = await configurePersistedStore(
        {
          reducer: { [sliceA.name]: sliceA.reducer, nested: nestedReducer },
        },
        'testApp',
        storage,
      );
      await flushTimersAndPromises();

      // Assert: State is correctly rehydrated.
      const state = newStore.getState();
      expect(state.sliceA.value).toBe('newA');
      expect(state.nested.sliceB.value).toBe('newB');
    });
  });

  describe('Edge Cases', () => {
    it('should handle lazy initialization of state', async () => {
      // Arrange
      const lazyInitialState = jest.fn(() => ({ value: 5 }));
      const slice = createPersistedSlice({
        name: 'lazy',
        initialState: lazyInitialState,
        reducers: {},
      });
      const store = await configurePersistedStore(
        { reducer: { [slice.name]: slice.reducer } },
        'testApp',
        storage,
      );
      await flushTimersAndPromises();

      // Assert
      expect(lazyInitialState).toHaveBeenCalled();
      expect(store.getState().lazy.value).toBe(5);
    });

    it('should handle reducers that return new state', async () => {
      // Arrange
      const slice = createPersistedSlice({
        name: 'returner',
        initialState: { value: 0 },
        reducers: {
          update: (state, action: PayloadAction<number>) => {
            return { value: state.value + action.payload }; // Return new state
          },
        },
      });
      const store = await configurePersistedStore(
        { reducer: { [slice.name]: slice.reducer } },
        'testApp',
        storage,
      );
      await flushTimersAndPromises();

      // Act
      store.dispatch(slice.actions.update(10));
      await flushTimersAndPromises();

      // Assert
      const persistedState = await storage.getItem('persist:testApp-returner');
      expect(store.getState().returner.value).toBe(10);
      expect(JSON.parse(persistedState!).value).toBe(10);
    });

    it('should correctly rehydrate a differently shaped state', async () => {
      // Arrange: Persisted state has an extra field.
      await storage.setItem(
        'persist:testApp-shape',
        '{"value": 10, "extra": "field"}',
      );
      const slice = createPersistedSlice({
        name: 'shape',
        initialState: { value: 0, other: 'default' },
        reducers: {},
      });
      const store = await configurePersistedStore(
        { reducer: { [slice.name]: slice.reducer } },
        'testApp',
        storage,
      );
      await flushTimersAndPromises();

      // Assert: The rehydrated state merges the persisted data.
      expect(store.getState().shape).toEqual({
        value: 10,
        extra: 'field',
      });
    });
  });
});
