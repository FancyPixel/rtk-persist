import { Store } from "@reduxjs/toolkit";
import { configurePersistedStore } from "../src";
import Settings from "../src/settings";
import { mockPersistedSlice, mockStorageHandler, sliceInitialState } from "./mocks";

describe('Persisted Store', () => {
  let store: Store;

  beforeEach(async () => {
    store = await configurePersistedStore({
      reducer: ({ [mockPersistedSlice.name]: mockPersistedSlice.reducer }),
    }, 'mock', mockStorageHandler);
  })

  it('should set the storage handler', () => {
    expect(Settings.storageHandler).toBe(mockStorageHandler);
  })

  it('should set the initial state of the persisted slices', () => {
    expect(store.getState()).toEqual({ [mockPersistedSlice.name]: sliceInitialState })
  })
});
