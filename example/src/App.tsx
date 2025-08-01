import './App.css'
import { counterSlice } from './state/counter/slice'
import { useAppDispatch, useAppSelector } from './state/hooks'


function App() {
  // The `state` arg is correctly typed as `RootState` already
  const count = useAppSelector((state) => state.counter.value)
  const dispatch = useAppDispatch()

  return (
    <>
      <h1>count is {count}</h1>
      <div className="card">
        <button onClick={() => dispatch(counterSlice.actions.decrement())}>
          -
        </button>
        <button onClick={() => dispatch(counterSlice.actions.increment())}>
          +
        </button>
      </div>
    </>
  )
}

export default App
