/**
 * @file Test suite for the PersistedProvider component.
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { useSelector } from 'react-redux';
import { createPersistedSlice } from '../../../src/core/slice';
import { configurePersistedStore } from '../../../src/core/store';
import { StorageHandler } from '../../../src/core/types';
import PersistedProvider from '../../../src/integrations/react-redux/PersistedProvider';
import { StorageMock } from '../../core/mocks';

// A simple component to display a value from the Redux store.
const DisplayCounter = () => {
  const count = useSelector((state: { counter: { value: number } }) => state.counter.value);
  return <div>Counter: {count}</div>;
};

describe('PersistedProvider', () => {
  let storage: StorageHandler;

  beforeEach(() => {
    storage = new StorageMock();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render the loader while the store is hydrating', () => {
    // Arrange: Create a promise that never resolves to simulate a long hydration.
    const neverResolvingStore = new Promise<any>(() => {});
    const loader = <div>Loading...</div>;

    // Act
    render(
      <PersistedProvider store={neverResolvingStore} loader={loader}>
        <div>Content</div>
      </PersistedProvider>,
    );

    // Assert: The loader is visible and the content is not.
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('should render null while hydrating if no loader is provided', () => {
    // Arrange
    const neverResolvingStore = new Promise<any>(() => {});

    // Act
    const { container } = render(
      <PersistedProvider store={neverResolvingStore}>
        <div>Content</div>
      </PersistedProvider>,
    );

    // Assert: The container is empty.
    expect(container.firstChild).toBeNull();
  });

  it('should render children after the store has been hydrated', async () => {
    // Arrange
    const counterSlice = createPersistedSlice({
      name: 'counter',
      initialState: { value: 0 },
      reducers: {},
    });
    const storePromise = configurePersistedStore(
      { reducer: { [counterSlice.name]: counterSlice.reducer } },
      'testApp',
      storage,
    );
    const loader = <div>Loading...</div>;

    // Act
    render(
      <PersistedProvider store={storePromise} loader={loader}>
        <div>ContentLoaded</div>
      </PersistedProvider>,
    );

    // Assert: The loader is initially visible.
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Assert: After the promise resolves, the content is visible and the loader is gone.
    await waitFor(() => {
      expect(screen.getByText('ContentLoaded')).toBeInTheDocument();
    });
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('should provide the hydrated store to child components', async () => {
    // Arrange
    const counterSlice = createPersistedSlice({
      name: 'counter',
      initialState: { value: 123 }, // Initial state to check against.
      reducers: {},
    });
    const storePromise = configurePersistedStore(
      { reducer: { [counterSlice.name]: counterSlice.reducer } },
      'testApp',
      storage,
    );

    // Act
    render(
      <PersistedProvider store={storePromise}>
        <DisplayCounter />
      </PersistedProvider>,
    );

    // Assert: The component correctly reads the initial state from the hydrated store.
    await waitFor(() => {
      expect(screen.getByText('Counter: 123')).toBeInTheDocument();
    });
  });
});
