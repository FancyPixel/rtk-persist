import {
  combineReducers,
  PayloadAction
} from "@reduxjs/toolkit";
import {
  configurePersistedStore,
  createPersistedReducer,
  createPersistedSlice,
} from "../src";
import { TestSettings } from "../src/settings";
import { writePersistedStorage } from "../src/utils";
import {
  mockPersistedSliceFactory,
  mockSliceName,
  sliceInitialState,
  StorageMock,
} from "./mocks";

// Define the shape of the state for type safety in tests.
type RootState = {
  [mockSliceName]: { counter: number };
};

describe("configurePersistedStore", () => {
  let storage: StorageMock;
  // Before each test, create a new storage mock and clear all global settings
  // to ensure tests are isolated from one another.
  beforeEach(() => {
    storage = new StorageMock();
    TestSettings.restoreDefaults();
  });

  it("should create a valid Redux store", async () => {
    const slice = createPersistedSlice({
      name: mockSliceName,
      initialState: sliceInitialState,
      reducers: {},
    });
    const store = await configurePersistedStore(
      {
        reducer: { [slice.name]: slice.reducer },
      },
      "mockApp",
      storage,
    );
    expect(store).not.toBeNull();
    expect(typeof store.dispatch).toBe("function");
    expect(typeof store.getState).toBe("function");
  });

  it("should correctly initialize the settings", async () => {
    const slice = createPersistedSlice({
      name: mockSliceName,
      initialState: sliceInitialState,
      reducers: {},
    });
    await configurePersistedStore(
      {
        reducer: { [slice.name]: slice.reducer },
      },
      "mockApp",
      storage,
    );
    expect(TestSettings.storageHandler).toBe(storage);
    expect(TestSettings.applicationId).toBe("mockApp");
  });

  it("should initialize with the correct initial state", async () => {
    const slice = createPersistedSlice({
      name: mockSliceName,
      initialState: sliceInitialState,
      reducers: {},
    });
    const store = await configurePersistedStore(
      {
        reducer: { [slice.name]: slice.reducer },
      },
      "mockApp",
      storage,
    );
    expect(store.getState()).toEqual({ [mockSliceName]: sliceInitialState });
  });

  it("should rehydrate the state from storage", async () => {
    await storage.setItem(
      `persist:mockApp-${mockSliceName}`,
      JSON.stringify({ counter: 50 }),
    );
    const slice = createPersistedSlice({
      name: mockSliceName,
      initialState: sliceInitialState,
      reducers: {},
    });
    const store = await configurePersistedStore(
      {
        reducer: { [slice.name]: slice.reducer },
      },
      "mockApp",
      storage,
    );
    const state = store.getState() as RootState;
    expect(state[mockSliceName].counter).toBe(50);
  });

  describe("enhanced store methods", () => {
    let store: Awaited<ReturnType<typeof configurePersistedStore<RootState>>>;
    let mockSlice: ReturnType<typeof mockPersistedSliceFactory>;

    beforeEach(async () => {
      // Create a fresh slice for each test to ensure isolation.
      mockSlice = mockPersistedSliceFactory();
      store = await configurePersistedStore(
        {
          reducer: { [mockSliceName]: mockSlice.reducer },
        },
        "mockApp",
        storage,
      );
    });

    it("should clear the persisted state from storage", async () => {
      jest.useFakeTimers();
      store.dispatch(mockSlice.actions.increment());
      jest.advanceTimersByTime(150);
      jest.useRealTimers();

      let stored = await storage.getItem(`persist:mockApp-${mockSliceName}`);
      expect(stored).not.toBeNull();

      await store.clearPersistedState();
      stored = await storage.getItem(`persist:mockApp-${mockSliceName}`);
      expect(stored).toBeNull();
    });

    it("should rehydrate the store on demand", async () => {
      await storage.setItem(
        `persist:mockApp-${mockSliceName}`,
        JSON.stringify({ counter: 99 }),
      );
      await store.rehydrate();
      const state = store.getState() as RootState;
      expect(state[mockSliceName].counter).toBe(99);
    });

    it("should trigger rehydration when a reducer is replaced", async () => {
      const newMockSlice = mockPersistedSliceFactory();
      writePersistedStorage({ [mockSliceName]: { counter: 123 } }, mockSliceName);

      const rehydrationComplete = new Promise<void>((resolve) => {
        const unsubscribe = store.subscribe(() => {
          const state = store.getState();
          if (state[mockSliceName].counter === 123) {
            unsubscribe();
            resolve();
          }
        });
      });

      store.replaceReducer(
        combineReducers({ [mockSliceName]: newMockSlice.reducer }),
      );
      await rehydrationComplete;

      const state = store.getState() as RootState;
      expect(state[mockSliceName].counter).toBe(123);
    });
  });

  describe("with complex reducer structures", () => {
    it("should correctly mix a persisted slice and a persisted reducer", async () => {
      // A standalone slice marked for persistence via createPersistedSlice.
      const persistedSlice = createPersistedSlice({
        name: "pSlice",
        initialState: { value: "A" },
        reducers: {
          setValue: (state, action: PayloadAction<string>) => {
            state.value = action.payload;
          },
        },
      });

      // Mark the manual reducer for persistence.
      const persistedManualReducer = createPersistedReducer('manual', { count: 0 }, (b) => {
        b.addCase('manual/increment', (state) => {
          return { ...state, count: state.count + 1 };
        });
      });

      const store = await configurePersistedStore(
        {
          reducer: {
            pSlice: persistedSlice.reducer,
            manual: persistedManualReducer,
          },
        },
        "mockApp",
        storage,
      );

      // Verify both the slice and the manual reducer are subscribed for persistence.
      expect(TestSettings.subscribedSliceIds).toEqual([
        "pSlice",
        "manual",
      ]);

      // Dispatch actions to both parts of the state.
      jest.useFakeTimers();
      store.dispatch(persistedSlice.actions.setValue("B"));
      store.dispatch({ type: 'manual/increment' });

      jest.advanceTimersByTime(150); // Allow persistence to occur.
      jest.useRealTimers();

      // Check that both were persisted correctly under their own keys.
      const persistedSliceStored = await storage.getItem(
        "persist:mockApp-pSlice",
      );
      const manualReducerStored = await storage.getItem(
        "persist:mockApp-manual",
      );
      expect(JSON.parse(persistedSliceStored!)).toEqual({ value: "B" });
      expect(JSON.parse(manualReducerStored!)).toEqual({ count: 1 });

      // Create a new store to test rehydration.
      TestSettings.restoreDefaults();
      const newStore = await configurePersistedStore(
        {
          reducer: {
            pSlice: persistedSlice.reducer,
            manual: persistedManualReducer,
          },
        },
        "mockApp",
        storage,
      );

      const state = newStore.getState();
      // Check that both parts of the state were correctly rehydrated.
      expect(state.pSlice.value).toBe("B");
      expect(state.manual.count).toBe(1);
    });
  });
});
