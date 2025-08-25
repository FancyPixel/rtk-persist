import { configurePersistedStore } from 'rtk-persist';
import { counterSlice } from './counter/slice';

export const store = configurePersistedStore({
  reducer: {
    [counterSlice.name]: counterSlice.reducer,
    // You can swap the slice with the reducer to test both implementations
    // counter: counterReducer,
  },
}, 'countersApp', localStorage);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
