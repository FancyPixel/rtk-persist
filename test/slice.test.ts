import { combineReducers, createAction, PayloadAction } from '@reduxjs/toolkit';
import { configurePersistedStore, createPersistedSlice } from '../src';
import { TestSettings } from '../src/settings';
import { StorageHandler } from '../src/types';
import { flushTimersAndPromises, StorageMock } from './mocks';

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

  it('should persist state from own reducers', async () => {
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
    const store = configurePersistedStore(
      { reducer: { [counterSlice.name]: counterSlice.reducer } },
      'testApp',
      storage,
    );
    await flushTimersAndPromises(); // Allow initial rehydration to complete

    // Act: Dispatch actions to update the state.
    store.dispatch(counterSlice.actions.increment());
    store.dispatch(counterSlice.actions.increment());
    await flushTimersAndPromises();

    expect(store.getState().counter.value).toBe(2);
    const persistedState = await storage.getItem('persist:testApp-counter');
    expect(JSON.parse(persistedState!).value).toBe(2);
  });

  it('should rehydrate state from storage', async () => {
    // Arrange: Pre-seed storage with existing data.
    await storage.setItem('persist:testApp-counter', '{\"value\": 10}');
    const counterSlice = createPersistedSlice({
      name: 'counter',
      initialState: { value: 0 },
      reducers: {},
    });

    // Act: Configure the store, which triggers rehydration.
    const store = configurePersistedStore(
      { reducer: { [counterSlice.name]: counterSlice.reducer } },
      'testApp',
      storage,
    );
    await flushTimersAndPromises(); // Wait for rehydration to complete

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
    const store = configurePersistedStore(
      { reducer: { [counterSlice.name]: counterSlice.reducer } },
      'testApp',
      storage,
    );

    await flushTimersAndPromises();

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
    const store = configurePersistedStore(
      { reducer: { [counterSlice.name]: counterSlice.reducer } },
      'testApp',
      storage,
    );
    await flushTimersAndPromises();

    // Act: Dispatch the external action and advance timers.
    store.dispatch(externalAction());
    await flushTimersAndPromises();

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
    const store = configurePersistedStore(
      { reducer: { [counterSlice.name]: counterSlice.reducer } },
      'testApp',
      storage,
    );
    const setItemSpy = jest.spyOn(storage, 'setItem');

    // Act: Dispatch an action that doesn't affect this slice's state.
    store.dispatch(externalAction());
    await flushTimersAndPromises();

    // Assert: Storage should not be written to, preventing unnecessary operations.
    expect(setItemSpy).not.toHaveBeenCalledWith(expect.anything(), counterSlice.name);
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
    const store = configurePersistedStore(
      { reducer: { [counterSlice.name]: counterSlice.reducer } },
      'testApp',
      storage,
    );

    await flushTimersAndPromises();

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
    const store = configurePersistedStore(
      { reducer: { [sliceA.reducerPath]: sliceA.reducer, [sliceB.reducerPath]: sliceB.reducer } },
      'testApp',
      storage,
    );

    // Act: Dispatch actions to both slices and advance timers.
    store.dispatch(sliceA.actions.update('newA'));
    store.dispatch(sliceB.actions.update('newB'));
    await flushTimersAndPromises();

    // Assert: Both slices are persisted independently to their own storage keys.
    const itemA = await storage.getItem('persist:testApp-sliceA');
    const itemB = await storage.getItem('persist:testApp-sliceB');
    expect(JSON.parse(itemA!).value).toBe('newA');
    expect(JSON.parse(itemB!).value).toBe('newB');
  });

  describe('with nesting', () => {
    it('should correctly infer nestedPath and persist/rehydrate a nested slice', async () => {
        // Arrange: Create two slices, one nested inside a combined reducer.
        const sliceA = createPersistedSlice({
            name: 'sliceA',
            initialState: { value: 'a' },
            reducers: { update: (state, action: PayloadAction<string>) => { state.value = action.payload } },
        });

        const sliceB = createPersistedSlice({
            name: 'sliceB',
            initialState: { value: 'b' },
            reducers: { update: (state, action: PayloadAction<string>) => { state.value = action.payload } },
        }, 'nested.sliceB');

        const nestedReducer = combineReducers({
            [sliceB.name]: sliceB.reducer,
        });

        const store = configurePersistedStore(
            {
                reducer: {
                    [sliceA.name]: sliceA.reducer,
                    nested: nestedReducer,
                },
            },
            'testApp',
            storage,
        );

        await flushTimersAndPromises();

        // Assert: Check that the nested path is correctly constructed and typed.
        expect(sliceA.nestedPath).toBe('sliceA');
        expect(sliceB.nestedPath).toBe('nested.sliceB');

        // Act: Dispatch actions to both slices.
        store.dispatch(sliceA.actions.update('newA'));
        store.dispatch(sliceB.actions.update('newB'));
        await flushTimersAndPromises();

        // Assert: Both slices are persisted correctly.
        const itemA = await storage.getItem('persist:testApp-sliceA');
        const itemB = await storage.getItem('persist:testApp-sliceB');
        expect(JSON.parse(itemA!).value).toBe('newA');
        expect(JSON.parse(itemB!).value).toBe('newB');

        // Arrange for rehydration: Create a new store instance.
        TestSettings.restoreDefaults();
        TestSettings.subscribeSlice(sliceA.name);
        TestSettings.subscribeSlice(sliceB.name);
        const newStore = configurePersistedStore(
            {
                reducer: {
                    [sliceA.name]: sliceA.reducer,
                    nested: nestedReducer,
                },
            },
            'testApp',
            storage,
        );
        await flushTimersAndPromises();

        // Assert: The state is correctly rehydrated.
        const state = newStore.getState();
        expect(state.sliceA.value).toBe('newA');
        expect(state.nested.sliceB.value).toBe('newB');
    });
  });
});
