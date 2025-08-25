import './App.css';
import { counterSlice } from './state/counter/slice';
import { useAppDispatch, useAppSelector } from './state/hooks';

function App() {
  const count = useAppSelector((state) => state.counter.value);
  const dispatch = useAppDispatch();

  return (
    <>
      <h1>rtk-persist Example</h1>
      <div className="card">
        <h2>Counter Value: {count}</h2>
        <div className='button-group'>
          <button onClick={() => dispatch(counterSlice.actions.decrement())}>
            -
          </button>
          <button onClick={() => dispatch(counterSlice.actions.increment())}>
            +
          </button>
        </div>
      </div>
    </>
  )
}

export default App
