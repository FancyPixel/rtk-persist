import { configurePersistedStore } from 'rtk-persist';
import { counterSlice } from './counter/slice';
import { statusSlice } from './status/slice';

export const store = configurePersistedStore({
  reducer: {
    [counterSlice.name]: counterSlice.reducer,
    // You can swap the slice with the reducer to test both implementations
    // counter: counterReducer,
    [statusSlice.name]: statusSlice.reducer,
  },
}, 'countersApp', localStorage);

export type Store = Awaited<typeof store>;
export type RootState = ReturnType<Store['getState']>;
export type AppDispatch = Store['dispatch'];
