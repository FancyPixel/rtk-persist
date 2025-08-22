/**
 * @file Test suite for the `createPersistedReducer` function.
 * This file covers the core functionality, rehydration logic, advanced
 * builder cases like matchers and default cases, and the handling of
 * the `nestedPath` property.
 */

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
    builder.addCase(
      increment,
      (state: typeof initialState, action: PayloadAction<number>) => {
        state.value += action.payload;
      },
    );
  });

  beforeEach(() => {
    mapOrBuilderCallback.mockClear();
  });

  // --- Core Reducer Functionality ---

  describe('Core Functionality', () => {
    it('should create a reducer that handles actions correctly', () => {
      const reducer = createPersistedReducer(
        reducerName,
        initialState,
        mapOrBuilderCallback,
      );
      const state = { value: 10 };

      const newState = reducer(state, increment(5));

      expect(newState.value).toBe(15);
      expect(mapOrBuilderCallback).toHaveBeenCalledTimes(1);
    });

    it('should return the initial state for undefined states', () => {
      const reducer = createPersistedReducer(
        reducerName,
        initialState,
        mapOrBuilderCallback,
      );
      const newState = reducer(undefined, { type: 'unknown' });

      expect(newState).toEqual(initialState);
    });

    it('should attach the correct reducerName property', () => {
      const reducer = createPersistedReducer(
        reducerName,
        initialState,
        mapOrBuilderCallback,
      );
      expect(reducer.reducerName).toBe(reducerName);
    });
  });

  // --- Nested Path Assignment ---

  describe('Nested Path Assignment', () => {
    it('should use the provided nestedPath when specified', () => {
      const nestedPath = 'nested.test';
      const reducer = createPersistedReducer(
        reducerName,
        initialState,
        mapOrBuilderCallback,
        nestedPath,
      );
      expect(reducer.nestedPath).toBe(nestedPath);
    });

    it('should default nestedPath to the reducerName when not provided', () => {
      const reducer = createPersistedReducer(
        reducerName,
        initialState,
        mapOrBuilderCallback,
      );
      expect(reducer.nestedPath).toBe(reducerName);
    });
  });

  // --- Rehydration Logic ---

  describe('Rehydration Logic', () => {
    it('should handle the REHYDRATE action and replace the state', () => {
      const reducer = createPersistedReducer(
        reducerName,
        initialState,
        mapOrBuilderCallback,
      );
      const rehydratedState = { value: 100 };
      const action: PayloadAction<
        RehydrateActionPayload<typeof reducerName, typeof initialState>
      > = {
        type: REHYDRATE.toString(),
        payload: { [reducerName]: rehydratedState },
      };

      const newState = reducer(initialState, action);

      expect(newState).toEqual(rehydratedState);
    });

    it('should not change state if the rehydration payload is for a different reducer', () => {
      const reducer = createPersistedReducer(
        reducerName,
        initialState,
        mapOrBuilderCallback,
      );
      const action: PayloadAction<
        RehydrateActionPayload<'anotherReducer', typeof initialState>
      > = {
        type: REHYDRATE.toString(),
        payload: { anotherReducer: { value: 100 } },
      };

      const newState = reducer(initialState, action);

      expect(newState).toEqual(initialState);
    });

    it('should not change state if the rehydration payload is null', () => {
      const reducer = createPersistedReducer(
        reducerName,
        initialState,
        mapOrBuilderCallback,
      );
      const action: PayloadAction<null> = {
        type: REHYDRATE.toString(),
        payload: null,
      };

      const newState = reducer(initialState, action);

      expect(newState).toEqual(initialState);
    });
  });

  // --- Advanced Builder Cases ---

  describe('Advanced Builder Cases', () => {
    it('should handle addMatcher correctly', () => {
      const specialAction = createAction<string>('special/action');
      const matcherCallback = jest.fn((builder: any) => {
        builder.addMatcher(
          (action: any) => action.type.endsWith('/action'),
          (state: typeof initialState, action: PayloadAction<string>) => {
            state.value = action.payload.length;
          },
        );
      });

      const reducer = createPersistedReducer(
        reducerName,
        initialState,
        matcherCallback,
      );
      const newState = reducer({ value: 0 }, specialAction('test-string'));

      expect(newState.value).toBe(11);
      expect(matcherCallback).toHaveBeenCalledTimes(1);
    });

    it('should handle addDefaultCase for unhandled actions', () => {
      const unhandledAction = { type: 'unhandled/action' };
      const defaultCaseCallback = jest.fn((builder: any) => {
        builder.addCase('some/other/case', (state: typeof initialState) => {
          state.value = 999;
        });
        builder.addDefaultCase((state: typeof initialState) => {
          state.value = -1;
        });
      });

      const reducer = createPersistedReducer(
        reducerName,
        initialState,
        defaultCaseCallback,
      );
      const newState = reducer({ value: 10 }, unhandledAction);

      expect(newState.value).toBe(-1);
      expect(defaultCaseCallback).toHaveBeenCalledTimes(1);
    });
  });

  // --- Edge Cases ---

  describe('Edge Cases', () => {
    it('should use a lazy initializer for the initial state', () => {
      const lazyInitialState = jest.fn(() => ({ value: 5 }));
      const reducer = createPersistedReducer(
        reducerName,
        lazyInitialState,
        () => {},
      );
      const newState = reducer(undefined, { type: 'unknown' });
      expect(lazyInitialState).toHaveBeenCalledTimes(1);
      expect(newState).toEqual({ value: 5 });
    });

    it('should accept a rehydrated state with a different shape', () => {
      const reducer = createPersistedReducer(
        reducerName,
        initialState,
        mapOrBuilderCallback,
      );
      const rehydratedState = { value: 100, extra: 'field' }; // New field
      const action = {
        type: REHYDRATE.toString(),
        payload: { [reducerName]: rehydratedState },
      };
      const newState = reducer(initialState, action);
      expect(newState).toEqual(rehydratedState);
    });

    it('should handle case reducers that return a new state object', () => {
      const returnerCallback = jest.fn((builder: any) => {
        builder.addCase(
          increment,
          (state: typeof initialState, action: PayloadAction<number>) => {
            return { value: state.value + action.payload };
          },
        );
      });
      const reducer = createPersistedReducer(
        reducerName,
        initialState,
        returnerCallback,
      );
      const state = { value: 20 };
      const newState = reducer(state, increment(10));
      expect(newState.value).toBe(30);
      expect(newState).not.toBe(state);
    });
  });
});
