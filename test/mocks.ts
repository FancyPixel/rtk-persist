import { PayloadAction } from "@reduxjs/toolkit";
import { StorageHandler } from "../src/types";
import { createPersistedSlice } from "../src/slice";

let data: Record<string, string> = {};
export const mockStorageHandler: StorageHandler = {
  getItem: (key: string) => {
    if (key in data) return data[key];
    throw new Error();
  },
  setItem: (key: string, value: string) => {
    data[key] = value;
  },
  removeItem: (key: string) => {
    delete data[key];
  },
};

export const sliceInitialState = { counter: 0 };
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
