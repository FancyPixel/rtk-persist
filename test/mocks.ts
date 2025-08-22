/**
 * @file This file contains shared mocks and utilities used across the test suite
 * for the rtk-persist library. It provides a mock storage implementation,
 * a factory for creating persisted slices, and other helper functions to
 * streamline testing.
 */

import { PayloadAction } from '@reduxjs/toolkit';
import { createPersistedSlice } from '../src/slice';
import { StorageHandler } from '../src/types';

/**
 * A simple in-memory storage mock that implements the `StorageHandler` interface.
 * Each instance maintains its own isolated data store, making it ideal for
 * ensuring that tests do not interfere with one another.
 * @internal
 */
export class StorageMock implements StorageHandler {
  private data: Record<string, string> = {};

  /**
   * Retrieves an item from the in-memory store.
   * @param key - The key of the item to retrieve.
   * @returns The stored value, or `null` if the key does not exist.
   */
  getItem(key: string): string | null {
    return key in this.data ? this.data[key] : null;
  }

  /**
   * Saves an item to the in-memory store.
   * @param key - The key to associate with the value.
   * @param value - The string value to store.
   */
  setItem(key: string, value: string): void {
    this.data[key] = value;
  }

  /**
   * Removes an item from the in-memory store.
   * @param key - The key of the item to remove.
   */
  removeItem(key: string): void {
    delete this.data[key];
  }

  /**
   * Clears all data from the in-memory store, resetting it to an empty state.
   */
  clear(): void {
    this.data = {};
  }
}

/**
 * The default initial state for the mock counter slice.
 * @internal
 */
export const sliceInitialState = { counter: 0 };

/**
 * The name used for the mock slice in tests.
 * @internal
 */
export const mockSliceName = 'testCounter';

/**
 * A factory function that creates a pre-configured persisted slice for use in tests.
 * It includes common reducers and selectors for a simple counter.
 * @returns A new persisted slice instance.
 * @internal
 */
export const mockPersistedSliceFactory = () =>
  createPersistedSlice({
    name: mockSliceName,
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
      },
    },
    selectors: {
      getCounter: (state) => state.counter,
    },
  });

/**
 * A helper function to robustly flush all pending promises and timers in Jest.
 * This is crucial for tests involving asynchronous operations like debouncing
 * and storage access.
 * @internal
 */
export const flushTimersAndPromises = async () => {
  await Promise.resolve();
  await new Promise((resolve) => jest.requireActual('timers').setImmediate(resolve));
  jest.advanceTimersByTime(150);
};
