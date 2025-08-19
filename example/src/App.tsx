import './App.css';
import { counterSlice } from './state/counter/slice';
import { useAppDispatch, useAppSelector } from './state/hooks';
import { setPaused } from './state/status/slice';
import { store as storePromise } from './state/store';


function App() {
  const count = useAppSelector((state) => state.counter.value);
  const { isPaused } = useAppSelector((state) => state.status);
  const dispatch = useAppDispatch();

  const handlePause = async () => {
    const store = await storePromise;
    store.pausePersist();
    dispatch(setPaused(true));
  };

  const handleResume = async () => {
    const store = await storePromise;
    store.resumePersist();
    dispatch(setPaused(false));
  };

  const handleClear = async () => {
    const store = await storePromise;
    await store.clearPersistedState();
    // Reload to show the state has been reset from storage.
    window.location.reload();
  };

  return (
    <>
      <h1>rtk-persist Example</h1>
      <div className="status-bar">
        <p>Persistence Status: <strong>{isPaused ? 'Paused' : 'Active'}</strong></p>
      </div>

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

      <div className="card">
        <h2>Persistence Controls</h2>
        <div className='button-group'>
          <button onClick={handlePause} disabled={isPaused}>
            Pause
          </button>
          <button onClick={handleResume} disabled={!isPaused}>
            Resume
          </button>
          <button onClick={handleClear} style={{ backgroundColor: '#c0392b' }}>
            Clear and Reload
          </button>
        </div>
      </div>
    </>
  )
}

export default App
