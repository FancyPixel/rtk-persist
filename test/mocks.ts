/**
 * @file This file contains shared mocks and utilities used across the test suite
 * for the rtk-persist library.
 */

import { PayloadAction } from "@reduxjs/toolkit";
import { createPersistedSlice } from "../src/slice";
import { StorageHandler } from "../src/types";

/**
 * A simple in-memory storage mock that implements the `StorageHandler` interface.
 * Each instance has its own isolated data store, making it ideal for ensuring
 * tests do not interfere with one another.
 * @public
 */
export class StorageMock implements StorageHandler {
  private data: Record<string, string> = {};

  /**
   * Retrieves an item from the in-memory store.
   * @param key - The key of the item to retrieve.
   * @returns The stored value, or `null` if the key does not exist.
   */
  getItem(key: string): Promise<string | null> | (string | null) {
    return key in this.data ? this.data[key] : null;
  }

  /**
   * Saves an item to the in-memory store.
   * @param key - The key to associate with the value.
   * @param value - The string value to store.
   */
  setItem(key: string, value: string): Promise<void> | void {
    this.data[key] = value;
  }

  /**
   * Removes an item from the in-memory store.
   * @param key - The key of the item to remove.
   */
  removeItem(key: string): Promise<void> | void {
    delete this.data[key];
  }

  /**
   * Clears all data from the in-memory store.
   */
  clear(): void {
    this.data = {};
  }
}

/**
 * The default initial state for the mock counter slice.
 * @public
 */
export const sliceInitialState = { counter: 0 };

/**
 * A pre-configured persisted slice for use in tests.
 * It includes common reducers and selectors for a counter.
 * @public
 */
export const mockPersistedSlice = createPersistedSlice({
  name: 'test-counter',
  initialState: sliceInitialState,
  reducers: {
    increment: (state) => {
      state.counter++;
    },
    decrement: (state) => {
      state.counter--;
    },
    setCounter: (state, action: PayloadAction<number>) => {
      state.counter = action.payload;
    }
  },
  selectors: {
    getCounter: (state) => state.counter,
  }
});
