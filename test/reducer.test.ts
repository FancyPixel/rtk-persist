import { createAction, PayloadAction } from '@reduxjs/toolkit';
import { createPersistedReducer } from '../src/reducer';
import { RehydrateActionPayload } from '../src/types';
import { REHYDRATE } from '../src/utils';

describe('createPersistedReducer', () => {
  // --- Test Setup ---
  const reducerName = 'test';
  const initialState = { value: 0 };
  const increment = createAction<number>('increment');

  // A mock callback that defines the reducer's logic.
  const mapOrBuilderCallback = jest.fn((builder: any) => {
    builder.addCase(increment, (state: typeof initialState, action: PayloadAction<number>) => {
      state.value += action.payload;
    });
  });

  // Before each test, we clear the mock callback.
  beforeEach(() => {
    mapOrBuilderCallback.mockClear();
  });

  // --- Core Reducer Tests ---

  it('should create a reducer that correctly handles actions defined in the builder callback', () => {
    const reducer = createPersistedReducer(reducerName, initialState, mapOrBuilderCallback);
    const state = { value: 10 };

    // Dispatch an action and check if the state is updated as expected.
    const newState = reducer(state, increment(5));

    expect(newState.value).toBe(15);
    expect(mapOrBuilderCallback).toHaveBeenCalledTimes(1);
  });

  it('should return the initial state when the state is undefined', () => {
    const reducer = createPersistedReducer(reducerName, initialState, mapOrBuilderCallback);

    // Call the reducer with an undefined state.
    const newState = reducer(undefined, { type: 'unknown' });

    expect(newState).toEqual(initialState);
  });

  it('should have the correct reducerName property attached', () => {
    const reducer = createPersistedReducer(reducerName, initialState, mapOrBuilderCallback);
    expect(reducer.reducerName).toBe(reducerName);
  });

  // --- Rehydration Tests ---

  describe('Rehydration', () => {
    it('should handle the REHYDRATE action and replace the state', () => {
      const reducer = createPersistedReducer(reducerName, initialState, mapOrBuilderCallback);
      const rehydratedState = { value: 100 };
      const action: PayloadAction<RehydrateActionPayload<typeof reducerName, typeof initialState>> = {
        type: REHYDRATE.toString(),
        payload: { [reducerName]: rehydratedState },
      };

      // Dispatch the rehydration action.
      const newState = reducer(initialState, action);

      expect(newState).toEqual(rehydratedState);
    });

    it('should not change state if the rehydration payload does not contain the reducer key', () => {
      const reducer = createPersistedReducer(reducerName, initialState, mapOrBuilderCallback);
      const action: PayloadAction<RehydrateActionPayload<'anotherReducer', typeof initialState>> = {
        type: REHYDRATE.toString(),
        payload: { anotherReducer: { value: 100 } },
      };

      // Dispatch rehydration action for a different reducer.
      const newState = reducer(initialState, action);

      expect(newState).toEqual(initialState);
    });

    it('should not change state if the rehydration payload is null', () => {
      const reducer = createPersistedReducer(reducerName, initialState, mapOrBuilderCallback);
      const action: PayloadAction<null> = {
        type: REHYDRATE.toString(),
        payload: null,
      };

      // Dispatch rehydration action with a null payload.
      const newState = reducer(initialState, action);

      expect(newState).toEqual(initialState);
    });
  });

  // --- Additional Builder Cases ---

  describe('Additional Builder Cases', () => {
    it('should handle addMatcher correctly', () => {
      const specialAction = createAction<string>('special/action');
      const matcherCallback = jest.fn((builder: any) => {
        builder.addMatcher(
          (action: any) => action.type.endsWith('/action'),
          (state: typeof initialState, action: PayloadAction<string>) => {
            // Set value to the length of the payload string
            state.value = action.payload.length;
          }
        );
      });

      const reducer = createPersistedReducer(reducerName, initialState, matcherCallback);
      const newState = reducer({ value: 0 }, specialAction('test-string'));

      expect(newState.value).toBe(11);
      expect(matcherCallback).toHaveBeenCalledTimes(1);
    });

    it('should handle addDefaultCase for unhandled actions', () => {
      const unhandledAction = { type: 'unhandled/action' };
      const defaultCaseCallback = jest.fn((builder: any) => {
        // This case will not match the unhandledAction
        builder.addCase('some/other/case', (state: typeof initialState) => {
          state.value = 999;
        });
        // The default case should be executed
        builder.addDefaultCase((state: typeof initialState) => {
          state.value = -1;
        });
      });

      const reducer = createPersistedReducer(reducerName, initialState, defaultCaseCallback);
      const newState = reducer({ value: 10 }, unhandledAction);

      expect(newState.value).toBe(-1);
      expect(defaultCaseCallback).toHaveBeenCalledTimes(1);
    });
  });
});
