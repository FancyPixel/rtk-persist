import { Store } from "@reduxjs/toolkit";
import { configurePersistedStore } from "../src";
import { mockPersistedSlice, mockStorageHandler, sliceInitialState } from "./mocks";
import Settings from "../src/settings";

describe('Persisted Store', () => {
  let store: Store;

  beforeEach(() => {
    store = configurePersistedStore({
      reducer: ({ [mockPersistedSlice.name]: mockPersistedSlice.reducer }),
    }, mockStorageHandler);
  })

  it('should set the storage handler', () => {
    expect(Settings.storageHandler).toBe(mockStorageHandler);
  })

  it('should set the initial state of the persisted slices', () => {
    expect(store.getState()).toEqual({ [mockPersistedSlice.name]: sliceInitialState })
  })
});
