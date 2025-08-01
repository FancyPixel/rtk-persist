import { configurePersistedStore } from 'rtk-persist'
// import { counterSlice } from './counter/slice'
import { reducer } from './counter/reducer'


export const store = configurePersistedStore({
  reducer: {
    // [counterSlice.name]: counterSlice.reducer,
    'counter': reducer,
  },
}, localStorage)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch