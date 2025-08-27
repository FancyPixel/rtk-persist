/**
 * @file Test suite for the `createPersistedReducer` function.
 * This file covers the core functionality, rehydration logic, advanced
 * builder cases like matchers and default cases, and the handling of
 * the `nestedPath` property.
 */

import { createAction, PayloadAction } from '@reduxjs/toolkit';
import { listenerMiddleware } from '../../src/core/middleware';
import { createPersistedReducer } from '../../src/core/reducer';
import { configurePersistedStore } from '../../src/core/store';
import { RehydrateActionPayload, StorageHandler } from '../../src/core/types';
import { REHYDRATE } from '../../src/core/utils';
import { flushTimersAndPromises, StorageMock } from './mocks';

describe('createPersistedReducer', () => {
  // --- Test Setup ---
  const reducerName = 'test';
  const initialState = { value: 0 };
  const increment = createAction<number>('increment');
  let storage: StorageHandler;

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
    // Set up a fresh mock storage and use fake timers for debounce control.
    storage = new StorageMock();
    mapOrBuilderCallback.mockClear();
    listenerMiddleware.clearListeners();
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Clean up timers after each test.
    jest.useRealTimers();
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
        {
          nestedPath,
        },
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

  // --- Persistence Options ---

  describe('Persistence Options (onPersist/onRehydrate)', () => {
    it('should use onPersist to transform state before persisting', async () => {
      // Arrange: onPersist will omit the 'sensitive' field.
      const update = createAction('update');
      const reducer = createPersistedReducer(
        'sensitive',
        { sensitive: 'secret', safe: 'public' },
        (builder) => {
          builder.addCase(update, (state) => {
            state.sensitive = 'new-secret';
            state.safe = 'new-public';
          });
        },
        {
          onPersist: (state) => ({ safe: state.safe }), // Only persist the 'safe' field
          onRehydrate: (savedState) => ({ safe: savedState.safe, sensitive: 'secret' })
        },
      );
      const store = await configurePersistedStore(
        { reducer: { sensitive: reducer } },
        'testApp1',
        storage,
      );
      await flushTimersAndPromises();

      // Act
      store.dispatch(update());
      await flushTimersAndPromises();

      // Assert: The stored data should be transformed.
      const persistedState = await storage.getItem(`persist:testApp1-sensitive`);
      const parsed = JSON.parse(persistedState!);
      expect(parsed.safe).toBe('new-public');
      expect(parsed.sensitive).toBeUndefined();
    });

    it('should use onRehydrate to transform state on startup', async () => {
      // Arrange: Pre-seed storage with a legacy data format.
      await storage.setItem(`persist:testApp2-legacy`, '{"v1_data": 42}');
      const reducer = createPersistedReducer(
        'legacy',
        { version: 2, data: 0 },
        () => {},
        {
          onPersist: (state) => ({
            v1_data: state.data,
          }),
          onRehydrate: (savedState) => ({
            version: 2, // Add new field
            data: savedState.v1_data, // Map old field to new field
          }),
        },
      );

      // Act: Configure the store to trigger rehydration.
      const store1 = await configurePersistedStore(
        { reducer: { legacy: reducer } },
        'testApp2',
        storage,
      );
      await flushTimersAndPromises();

      // Assert: The state should be correctly transformed.
      expect(store1.getState().legacy).toEqual({ version: 2, data: 42 });
    });

    it('should correctly perform a round-trip with onPersist and onRehydrate', async () => {
      // Arrange: Use onPersist to minify state and onRehydrate to expand it.
      type SliceState = { user: string; lastLogin: number };
      type SavedState = { u: string; l: number };

      const login = createAction<SliceState>('login');

      const reducer = createPersistedReducer(
        'minified',
        { user: '', lastLogin: 0 } as SliceState,
        (builder) => {
          builder.addCase(login, (state, action: PayloadAction<SliceState>) => {
            state.user = action.payload.user;
            state.lastLogin = action.payload.lastLogin;
          });
        },
        {
          onPersist: (state: SliceState): SavedState => ({
            u: state.user,
            l: state.lastLogin,
          }),
          onRehydrate: (saved: SavedState): SliceState => ({
            user: saved.u,
            lastLogin: saved.l,
          }),
        },
      );

      // --- Part 1: Persist the data ---
      const store1 = await configurePersistedStore(
        { reducer: { minified: reducer } },
        'testApp3',
        storage,
      );
      await flushTimersAndPromises();

      store1.dispatch(login({ user: 'test', lastLogin: 123 }));
      await flushTimersAndPromises();

      // Assert that the minified version was stored.
      const persisted = await storage.getItem(`persist:testApp3-minified`);
      expect(JSON.parse(persisted!)).toEqual({ u: 'test', l: 123 });

      // --- Part 2: Rehydrate the data ---
      const store2 = await configurePersistedStore(
        { reducer: { minified: reducer } },
        'testApp3',
        storage,
      );
      await flushTimersAndPromises();

      // Assert that the state was correctly expanded upon rehydration.
      expect(store2.getState().minified).toEqual({
        user: 'test',
        lastLogin: 123,
      });
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
