import {
  createSlice,
  CreateSliceOptions,
  ListenerMiddlewareInstance,
  PayloadAction,
  Slice,
  SliceCaseReducers,
  SliceSelectors,
} from '@reduxjs/toolkit';
import Settings from './settings';
import { Builder } from './extraReducersBuilder';
import { DEFAULT_INIT_ACTION_TYPE } from './store';
import { listenerMiddleware } from './middleware';
import UpdatedAtHelper from './updatedAtHelper';

const getStorageName = (sliceName: string) => `persisted-storage-${sliceName}`;

/**
 * Return the stored data of a slice if saved
 *
 * @returns The stored state of the slice if saved
 *
 * @public
 */
export async function getStoredState<T>(sliceName: string): Promise<Partial<T> | null> {
  try {
    const storageJson = (await Settings.storageHandler.getItem(getStorageName(sliceName)));
    if (!storageJson) return null;
    return JSON.parse(storageJson);
  } catch (e) {
    // console.error(e);
  }
  return null;
}

/**
 * A function that accepts an initial state, an object full of reducer
 * functions, and a "slice name", and automatically generates
 * action creators and action types that correspond to the
 * reducers and state.
 *
 * The state will be persisted throughout multiple reloads.
 * It requires to use {@link configurePersistedStore | configurePersistedStore}
 *
 * @param options The slice configuration.
 * @returns A persisted Redux slice.
 *
 * @public
 */
export const createPersistedSlice: <
  SliceState,
  Name extends string = string,
  PCR extends
    SliceCaseReducers<SliceState> = SliceCaseReducers<SliceState>,
  ReducerPath extends string = Name,
  PeristedSelectors extends
    SliceSelectors<SliceState> = SliceSelectors<SliceState>,
>(
  sliceOptions: CreateSliceOptions<
    SliceState,
    PCR,
    Name,
    ReducerPath,
    PeristedSelectors
  >,
  filtersSlice?: (state: SliceState) => Partial<SliceState>,
) => Omit<
  Slice<SliceState, PCR, Name, ReducerPath, PeristedSelectors>,
  'getInitialState'
> & {
  getInitialState: () => Promise<SliceState>;
  listenerMiddleware: ListenerMiddlewareInstance;
  clearPersistedStorage: () => void;
} = <
  SliceState,
  Name extends string = string,
  PCR extends
    SliceCaseReducers<SliceState> = SliceCaseReducers<SliceState>,
  ReducerPath extends string = Name,
  PeristedSelectors extends
    SliceSelectors<SliceState> = SliceSelectors<SliceState>,
>(
  sliceOptions: CreateSliceOptions<
    SliceState,
    PCR,
    Name,
    ReducerPath,
    PeristedSelectors
  >,
  filtersSlice: (state: SliceState) => Partial<SliceState> = state => state,
) => {
  const storageName = getStorageName(sliceOptions.name);

  /**
   * Creates a typed version of the startListening function
   * of the listener middlerware
   *
   * {@link @reduxjs/toolkit#createListenerMiddleware}
   */
  const startAppListening =
    listenerMiddleware.startListening.withTypes<
      Record<Name, SliceState>
    >();

    /**
     * Overrides the getInitialState function to return the stored data
     *
     * @returns The initial state of the slice merged with the stored data
     *
     * @public
     */
    async function getInitialState(): Promise<SliceState> {
      let storage: Partial<SliceState> = slice.getInitialState();
      try {
        storage = await getStoredState(sliceOptions.name) ?? storage;
      } catch (e) {
        // console.error(e);
      }
      return { ...slice.getInitialState(), ...storage };
    }

    /**
     * Writes the updated state to the selected storage
     *
     * @param storedData The state to be persisted
     *
     * @internal
     */
    async function writePersistedStorage(storedData: SliceState) {
      await Settings.storageHandler.setItem(
        storageName,
        JSON.stringify(filtersSlice(storedData)),
      );
      UpdatedAtHelper.onSave(sliceOptions.name);
    }

    /**
     * Clears the stored data from the selected storage
     *
     * @public
     */
    async function clearPersistedStorage() {
      await Settings.storageHandler.removeItem(storageName);
    }

  /**
   * Creates the slice using the default options passed by the user.
   *
   * We add the default state the attribute sliceStorageLastUpdateAt that tracks
   * when a change happens only on the specific state slice.
   *
   * We then extend each extra readucer to update sliceStorageLastUpdateAt.
   */
  const slice = createSlice({
    ...sliceOptions,
    extraReducers: builder => {
      builder.addMatcher(({ type }) => type === `${sliceOptions.name}\\${DEFAULT_INIT_ACTION_TYPE}`, (_state, action: PayloadAction<SliceState | null>): void | SliceState => {
        if (action.payload) return action.payload;
      });
      const b = new Builder(builder, UpdatedAtHelper.onStateChange.bind(null, sliceOptions.name));
      sliceOptions.extraReducers?.(b);
    },
  });

  /**
   * Adds a listener for every action of the slice
   * to react when they are dispatched and save
   * the new state to the storage
   */
  Object.keys(slice.actions).forEach(type => {
    startAppListening({
      type: `${slice.name}/${type}`,
      effect: (_action, { getState }) => {
        const state = getState();
        writePersistedStorage(state[sliceOptions.name]);
      },
    });
  });

  /**
   * Adds the listener to any actions handled by the slice
   * and updates the stored data if a change happened.
   *
   * We track all the changes of our state updating a custom
   * attribute saving the time when the change happened.
   */
  startAppListening({
    predicate: (action) => {
      if (action.type === DEFAULT_INIT_ACTION_TYPE || action.type.startsWith(`${slice.name}/`)) return false;
      return true;
    },
    effect: async (_action, { getState }) => {
      if (!await UpdatedAtHelper.shouldSave(sliceOptions.name)) return;
      const state = getState();
      writePersistedStorage(state[sliceOptions.name]);
    },
  });

  // TODO
  startAppListening({
    type: `${slice.name}/${DEFAULT_INIT_ACTION_TYPE}`,
    effect: () => {
      UpdatedAtHelper.onStateChange(sliceOptions.name);
    },
  });

  return {
    ...slice,
    getInitialState,
    listenerMiddleware,
    clearPersistedStorage,
  };
};
