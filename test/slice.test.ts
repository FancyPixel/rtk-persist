import { createAction, PayloadAction } from '@reduxjs/toolkit';
import { configurePersistedStore, createPersistedSlice } from '../src';
import { TestSettings } from '../src/settings';
import { StorageHandler } from '../src/types';
import { StorageMock } from './mocks';

describe('createPersistedSlice', () => {
  let storage: StorageHandler;

  beforeEach(() => {
    // Set up a fresh mock storage for each test and use fake timers for debounce control.
    storage = new StorageMock();
    TestSettings.restoreDefaults();
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Clean up timers after each test.
    jest.useRealTimers();
  });

  it('should persist state from own reducers after a debounce period', async () => {
    // Arrange: Create a slice and a persisted store.
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
      { reducer: { counter: counterSlice.reducer } },
      'testApp',
      storage,
    );

    // Act: Dispatch actions to update the state.
    store.dispatch(counterSlice.actions.increment());
    store.dispatch(counterSlice.actions.increment());

    // Assert: State updates immediately, but persistence is debounced.
    expect(store.getState().counter.value).toBe(2);
    expect(await storage.getItem('persist:testApp-counter')).toBeNull();

    // Act: Advance time past the debounce period.
    jest.advanceTimersByTime(150); // Allow async storage operations to complete.

    // Assert: The new state is now persisted.
    const persistedState = await storage.getItem('persist:testApp-counter');
    expect(JSON.parse(persistedState!).value).toBe(2);
  });

  it('should rehydrate state from storage', async () => {
    // Arrange: Pre-seed storage with existing data.
    await storage.setItem('persist:testApp-counter', '{"value": 10}');
    const counterSlice = createPersistedSlice({
      name: 'counter',
      initialState: { value: 0 },
      reducers: {},
    });

    // Act: Configure the store, which triggers rehydration.
    const store = await configurePersistedStore(
      { reducer: { counter: counterSlice.reducer } },
      'testApp',
      storage,
    );

    // Assert: The rehydrated state includes the persisted value.
    const finalState = store.getState().counter;
    expect(finalState.value).toBe(10);
  });

  it('should use initial state if storage is empty', async () => {
    // Arrange: Create a slice with no pre-existing data in storage.
    const counterSlice = createPersistedSlice({
      name: 'counter',
      initialState: { value: 0 },
      reducers: {},
    });

    // Act: Configure the store.
    const store = await configurePersistedStore(
      { reducer: { counter: counterSlice.reducer } },
      'testApp',
      storage,
    );

    // Assert: The slice uses its defined initial state.
    expect(store.getState().counter.value).toBe(0);
  });

  it('should persist state when an extra reducer updates the state', async () => {
    // Arrange: Create a slice that listens to an external action.
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
      { reducer: { counter: counterSlice.reducer } },
      'testApp',
      storage,
    );

    // Act: Dispatch the external action and advance timers.
    store.dispatch(externalAction());
    jest.advanceTimersByTime(1000);

    // Assert: The state was updated by the extra reducer and then persisted.
    const persistedState = await storage.getItem('persist:testApp-counter');
    expect(store.getState().counter.value).toBe(100);
    expect(JSON.parse(persistedState!).value).toBe(100);
  });

  it('should NOT persist state when an extra reducer is called but does not update the state', async () => {
    // Arrange: Create a slice and spy on the storage setItem method.
    const externalAction = createAction('external/action');
    const counterSlice = createPersistedSlice({
      name: 'counter',
      initialState: { value: 0 },
      reducers: {},
      // This slice does NOT handle the external action, so its state won't change.
    });
    const store = await configurePersistedStore(
      { reducer: { counter: counterSlice.reducer } },
      'testApp',
      storage,
    );
    const setItemSpy = jest.spyOn(storage, 'setItem');

    // Act: Dispatch an action that doesn't affect this slice's state.
    store.dispatch(externalAction());
    jest.advanceTimersByTime(150);

    // Assert: Storage should not be written to, preventing unnecessary operations.
    expect(setItemSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
  });

  it('should fall back to initial state when persisted data is corrupted', async () => {
    // Arrange: Put invalid JSON into storage.
    await storage.setItem('persist:testApp-counter', '{"value": 10, corrupted}');
    const counterSlice = createPersistedSlice({
      name: 'counter',
      initialState: { value: 0 },
      reducers: {},
    });

    // Act: Configure the store.
    const store = await configurePersistedStore(
      { reducer: { counter: counterSlice.reducer } },
      'testApp',
      storage,
    );

    // Assert: The slice gracefully ignores the corrupted data and uses its initial state.
    expect(store.getState().counter.value).toBe(0);
  });

  it('should handle multiple persisted slices correctly', async () => {
    // Arrange: Create two distinct persisted slices.
    const sliceA = createPersistedSlice({
      name: 'sliceA',
      initialState: { value: 'a' },
      reducers: { update: (state, action: PayloadAction<string>) => { state.value = action.payload } },
    });
    const sliceB = createPersistedSlice({
      name: 'sliceB',
      initialState: { value: 'b' },
      reducers: { update: (state, action: PayloadAction<string>) => { state.value = action.payload } },
    });
    const store = await configurePersistedStore(
      { reducer: { a: sliceA.reducer, b: sliceB.reducer } },
      'testApp',
      storage,
    );

    // Act: Dispatch actions to both slices and advance timers.
    store.dispatch(sliceA.actions.update('newA'));
    store.dispatch(sliceB.actions.update('newB'));
    jest.advanceTimersByTime(1000);

    // Assert: Both slices are persisted independently to their own storage keys.
    const itemA = await storage.getItem('persist:testApp-sliceA');
    const itemB = await storage.getItem('persist:testApp-sliceB');
    expect(JSON.parse(itemA!).value).toBe('newA');
    expect(JSON.parse(itemB!).value).toBe('newB');
  });
});
