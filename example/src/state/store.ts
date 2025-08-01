import { configurePersistedStore } from 'rtk-persist'
import { counterSlice } from './counter/slice'


export const store = configurePersistedStore({
  reducer: {
    [counterSlice.name]: counterSlice.reducer,
  },
}, localStorage)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch