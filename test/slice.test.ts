import { createAction, PayloadAction } from '@reduxjs/toolkit';
import { configurePersistedStore, createPersistedSlice } from '../src';
import { TestSettings } from '../src/settings';
import { StorageHandler } from '../src/types';
import { StorageMock } from './mocks';

describe('createPersistedSlice', () => {
  let storage: StorageHandler;

  beforeEach(() => {
    storage = new StorageMock();
    TestSettings._clearSettings();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should persist state changes to storage after a debounce period', async () => {
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

    store.dispatch(counterSlice.actions.increment());
    store.dispatch(counterSlice.actions.increment());

    // State should be updated immediately
    expect(store.getState().counter.value).toBe(2);
    // Storage should not be updated yet due to debouncing
    expect(await storage.getItem('persist:testApp-counter')).toBeNull();

    // Advance timers past the debounce period
    jest.advanceTimersByTime(150);

    // Now, the state should be persisted
    await Promise.resolve(); // Allow promises to resolve
    const storedItem = await storage.getItem('persist:testApp-counter');
    expect(JSON.parse(storedItem!)).toEqual({ value: 2 });
  });

  it('should rehydrate state from storage on initial load', async () => {
    // Pre-populate storage with a saved state
    await storage.setItem('persist:testApp-counter', JSON.stringify({ value: 10 }));

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

    // The store should be initialized with the state from storage, not the initial state
    expect(store.getState().counter.value).toBe(10);
  });

  it('should not rehydrate state more than once', async () => {
    await storage.setItem('persist:testApp-counter', JSON.stringify({ value: 10 }));

    const counterSlice = createPersistedSlice({
      name: 'counter',
      initialState: { value: 0 },
      reducers: {},
    });

    const store = await configurePersistedStore(
      { reducer: { counter: counterSlice.reducer } },
      'testApp',
      storage,
    );

    // Initial rehydration
    expect(store.getState().counter.value).toBe(10);

    // Manually trigger another rehydration
    await store.rehydrate();

    // The state should remain unchanged
    expect(store.getState().counter.value).toBe(10);
  });

  it('should not persist state when persistence is paused', async () => {
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

    // Pause persistence
    store.pausePersist();

    store.dispatch(counterSlice.actions.increment());

    // Advance timers
    jest.advanceTimersByTime(150);

    // Storage should remain empty
    await Promise.resolve();
    expect(await storage.getItem('persist:testApp-counter')).toBeNull();
  });

  it('should merge persisted state with initial state', async () => {
    await storage.setItem('persist:testApp-complex', JSON.stringify({ b: 20, c: 30 }));

    const complexSlice = createPersistedSlice({
      name: 'complex',
      initialState: { a: 1, b: 2 },
      reducers: {},
    });

    const store = await configurePersistedStore(
      { reducer: { complex: complexSlice.reducer } },
      'testApp',
      storage,
    );

    // 'a' should come from initialState, 'b' and 'c' from persisted state
    expect(store.getState().complex).toEqual({ a: 1, b: 20, c: 30 });
  });

  it('should persist state changes from extraReducers', async () => {
    const externalAction = createAction<number>('external/increment');
    const counterSlice = createPersistedSlice({
      name: 'counter',
      initialState: { value: 0 },
      reducers: {},
      extraReducers: (builder) => {
        builder.addCase(externalAction, (state, action) => {
          state.value += action.payload;
        });
      },
    });

    const store = await configurePersistedStore(
      { reducer: { counter: counterSlice.reducer } },
      'testApp',
      storage,
    );

    store.dispatch(externalAction(5));
    jest.advanceTimersByTime(150);

    await Promise.resolve();
    const storedItem = await storage.getItem('persist:testApp-counter');
    expect(JSON.parse(storedItem!)).toEqual({ value: 5 });
  });

  it('should handle corrupted or invalid JSON in storage gracefully', async () => {
    await storage.setItem('persist:testApp-counter', '{"value": 10, corrupted}');

    const counterSlice = createPersistedSlice({
      name: 'counter',
      initialState: { value: 0 },
      reducers: {},
    });

    const store = await configurePersistedStore(
      { reducer: { counter: counterSlice.reducer } },
      'testApp',
      storage,
    );

    // Should fall back to the initial state
    expect(store.getState().counter.value).toBe(0);
  });

  it('should handle multiple persisted slices correctly', async () => {
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

    store.dispatch(sliceA.actions.update('newA'));
    store.dispatch(sliceB.actions.update('newB'));

    jest.advanceTimersByTime(150);
    await Promise.resolve();

    const itemA = await storage.getItem('persist:testApp-sliceA');
    const itemB = await storage.getItem('persist:testApp-sliceB');

    expect(JSON.parse(itemA!)).toEqual({ value: 'newA' });
    expect(JSON.parse(itemB!)).toEqual({ value: 'newB' });
  });
});
