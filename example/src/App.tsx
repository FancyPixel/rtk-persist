import './App.css'
import { decrement, increment } from './state/counter/reducer'
import { useAppDispatch, useAppSelector } from './state/hooks'


function App() {
  // The `state` arg is correctly typed as `RootState` already
  const count = useAppSelector((state) => state.counter.value)
  const dispatch = useAppDispatch()

  return (
    <>
      <h1>count is {count}</h1>
      <div className="card">
        {/* <button onClick={() => dispatch(counterSlice.actions.decrement())}>
          -
        </button>
        <button onClick={() => dispatch(counterSlice.actions.increment())}>
          +
        </button> */}
        <button onClick={() => dispatch(decrement(1))}>
          -
        </button>
        <button onClick={() => dispatch(increment(1))}>
          +
        </button>
      </div>
    </>
  )
}

export default App
