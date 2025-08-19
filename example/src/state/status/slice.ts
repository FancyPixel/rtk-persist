import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface StatusState {
  isPaused: boolean;
}

const initialState: StatusState = {
  isPaused: false,
};

export const statusSlice = createSlice({
  name: 'status',
  initialState,
  reducers: {
    setPaused: (state, action: PayloadAction<boolean>) => {
      state.isPaused = action.payload;
    },
  },
});

export const { setPaused } = statusSlice.actions;

export default statusSlice.reducer;
