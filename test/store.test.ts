import { Reducer } from "@reduxjs/toolkit";
import { configurePersistedStore, createPersistedSlice } from "../src";
import { TestSettings } from "../src/settings";
import { sliceInitialState, StorageMock } from "./mocks";

// Define the shape of the state for type safety in tests.
type RootState = {
  [key: string]: { counter: number }
};

describe('configurePersistedStore', () => {
  let storage: StorageMock;
  const sliceName = 'testCounter';

  // Before each test, create a new storage mock and clear all global settings
  // to ensure tests are isolated from one another.
  beforeEach(() => {
    storage = new StorageMock();
    TestSettings._clearSettings();
  });

  it('should create a valid Redux store', async () => {
    const slice = createPersistedSlice({ name: sliceName, initialState: sliceInitialState, reducers: {} });
    const store = await configurePersistedStore({
      reducer: { [slice.name]: slice.reducer },
    }, 'mockApp', storage);
    expect(store).not.toBeNull();
    expect(typeof store.dispatch).toBe('function');
    expect(typeof store.getState).toBe('function');
  });

  it('should correctly initialize the settings', async () => {
    const slice = createPersistedSlice({ name: sliceName, initialState: sliceInitialState, reducers: {} });
    await configurePersistedStore({
      reducer: { [slice.name]: slice.reducer },
    }, 'mockApp', storage);
    expect(TestSettings.storageHandler).toBe(storage);
    expect(TestSettings.applicationId).toBe('mockApp');
  });

  it('should initialize with the correct initial state', async () => {
    const slice = createPersistedSlice({ name: sliceName, initialState: sliceInitialState, reducers: {} });
    const store = await configurePersistedStore({
      reducer: { [slice.name]: slice.reducer },
    }, 'mockApp', storage);
    expect(store.getState()).toEqual({ [sliceName]: sliceInitialState });
  });

  it('should rehydrate the state from storage', async () => {
    await storage.setItem(`persist:mockApp-${sliceName}`, JSON.stringify({ counter: 50 }));
    const slice = createPersistedSlice({ name: sliceName, initialState: sliceInitialState, reducers: {} });
    const store = await configurePersistedStore({
      reducer: { [slice.name]: slice.reducer },
    }, 'mockApp', storage);
    const state = store.getState() as RootState;
    expect(state[sliceName].counter).toBe(50);
  });

  describe('enhanced store methods', () => {
    let store: Awaited<ReturnType<typeof configurePersistedStore>>;
    let mockSlice = createPersistedSlice({
      name: sliceName,
      initialState: sliceInitialState,
      reducers: {
        increment: (state) => { state.counter++ }
      }
    });

    beforeEach(async () => {
      mockSlice = createPersistedSlice({
        name: sliceName,
        initialState: sliceInitialState,
        reducers: {
          increment: (state) => { state.counter++ }
        }
      });
      store = await configurePersistedStore({
        reducer: { [mockSlice.name]: mockSlice.reducer },
      }, 'mockApp', storage);
    });

    it('should clear the persisted state from storage', async () => {
      jest.useFakeTimers();
      store.dispatch(mockSlice.actions.increment());
      jest.advanceTimersByTime(150);
      await Promise.resolve();
      jest.useRealTimers();

      let stored = await storage.getItem(`persist:mockApp-${sliceName}`);
      expect(stored).not.toBeNull();

      await store.clearPersistedState();
      stored = await storage.getItem(`persist:mockApp-${sliceName}`);
      expect(stored).toBeNull();
    });

    it('should rehydrate the store on demand', async () => {
      await storage.setItem(`persist:mockApp-${sliceName}`, JSON.stringify({ counter: 99 }));
      await store.rehydrate();
      const state = store.getState() as RootState;
      expect(state[sliceName].counter).toBe(99);
    });

    it('should trigger rehydration when a reducer is replaced', async () => {
      const newReducer: Reducer = (state = { counter: -1 }) => state;
      await storage.setItem(`persist:mockApp-${sliceName}`, JSON.stringify({ counter: 123 }));

      store.replaceReducer({ [sliceName]: newReducer } as any);
      await new Promise(resolve => setTimeout(resolve, 0)); // Allow rehydration to complete

      const state = store.getState() as RootState;
      expect(state[sliceName].counter).toBe(123);
    });

    it('should pause and resume persistence', async () => {
      jest.useFakeTimers();

      store.pausePersist();
      store.dispatch(mockSlice.actions.increment());
      jest.advanceTimersByTime(150);
      await Promise.resolve();

      let stored = await storage.getItem(`persist:mockApp-${sliceName}`);
      expect(stored).toBeNull();

      store.resumePersist();
      jest.advanceTimersByTime(150);
      await Promise.resolve();

      stored = await storage.getItem(`persist:mockApp-${sliceName}`);
      expect(JSON.parse(stored!)).toEqual({ counter: 1 });

      jest.useRealTimers();
    });
  });
});
