import { createAction } from "@reduxjs/toolkit";
import { createPersistedReducer } from "rtk-persist";

export const increment = createAction<number>('increment');
export const decrement = createAction<number>('decrement');

export const { reducer, reducerName } = createPersistedReducer(
  'counter', // A unique name for the reducer
  { value: 0 }, // Initial state
  (builder) => {
    builder
      .addCase(increment, (state, action) => {
        state.value += action.payload;
      })
      .addCase(decrement, (state, action) => {
        state.value -= action.payload;
      });
  }
);
