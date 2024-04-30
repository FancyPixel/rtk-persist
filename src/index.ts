import {
  createSlice,
  CreateSliceOptions,
  ListenerMiddlewareInstance,
  Slice,
  SliceCaseReducers,
  SliceSelectors,
} from '@reduxjs/toolkit';
import Settings from './settings';
import { Builder } from './extraReducersBuilder';
import { configurePersistedStore } from './store';
import { listenerMiddleware } from './middleware';

const createPersistedSlice: <
  PersistedSliceState extends Object & {
    sliceStorageLastUpdateAt?: number;
  },
  Name extends string = string,
  PCR extends
    SliceCaseReducers<PersistedSliceState> = SliceCaseReducers<PersistedSliceState>,
  ReducerPath extends string = Name,
  PeristedSelectors extends
    SliceSelectors<PersistedSliceState> = SliceSelectors<PersistedSliceState>,
>(
  sliceOptions: CreateSliceOptions<
    PersistedSliceState,
    PCR,
    Name,
    ReducerPath,
    PeristedSelectors
  >,
  filtersSlice?: (state: PersistedSliceState) => Partial<PersistedSliceState>,
) => Omit<
  Slice<PersistedSliceState, PCR, Name, ReducerPath, PeristedSelectors>,
  'getInitialState'
> & {
  getInitialState: () => Promise<PersistedSliceState>;
  listenerMiddleware: ListenerMiddlewareInstance;
  clearPersistedStorage: () => void;
} = <
  PersistedSliceState extends {
    sliceStorageLastUpdateAt?: number;
  },
  Name extends string = string,
  PCR extends
    SliceCaseReducers<PersistedSliceState> = SliceCaseReducers<PersistedSliceState>,
  ReducerPath extends string = Name,
  PeristedSelectors extends
    SliceSelectors<PersistedSliceState> = SliceSelectors<PersistedSliceState>,
>(
  sliceOptions: CreateSliceOptions<
    PersistedSliceState,
    PCR,
    Name,
    ReducerPath,
    PeristedSelectors
  >,
  filtersSlice: (state: PersistedSliceState) => Partial<PersistedSliceState> = state => state,
) => {
  const storageName = `storage-${sliceOptions.name}`;

  const startAppListening =
    listenerMiddleware.startListening.withTypes<
      Record<Name, PersistedSliceState>
    >();

  const slice = createSlice<
    PersistedSliceState,
    PCR,
    Name,
    PeristedSelectors,
    ReducerPath
  >({
    ...sliceOptions,
    initialState: () => {
      const init =
        typeof sliceOptions.initialState === 'function'
          ? sliceOptions.initialState()
          : sliceOptions.initialState;
      return {
        ...init,
        sliceStorageLastUpdateAt: 0,
      };
    },
    extraReducers: builder => {
      const b = new Builder(slice.name, builder);
      sliceOptions.extraReducers?.(b);
    },
  });

  async function getInitialState(): Promise<PersistedSliceState> {
    let storage = slice.getInitialState();
    try {
      const storageJson = (await Settings.storageHandler.getItem(storageName)) as
        | string
        | null;
      storage = JSON.parse(storageJson ?? '{}');
    } catch (e) {
      console.error(e);
    }
    return { ...slice.getInitialState(), ...storage };
  }

  async function writePersistedStorage(storedData: PersistedSliceState) {
    await Settings.storageHandler.setItem(
      storageName,
      JSON.stringify(filtersSlice(storedData)),
    );
  }

  async function clearPersistedStorage() {
    await Settings.storageHandler.removeItem(storageName);
  }

  // Slice reducer handler
  Object.keys(slice.actions).forEach(type => {
    startAppListening({
      type: `${slice.name}/${type}`,
      effect: (_action, { getState }) => {
        const state = getState();
        writePersistedStorage(state[sliceOptions.name]);
      },
    });
  });

  startAppListening({
    predicate: (_action, currentState, previousState) => {
      const current = currentState[sliceOptions.name];
      const previous = previousState[sliceOptions.name];
      return (
        current.sliceStorageLastUpdateAt !== previous.sliceStorageLastUpdateAt
      );
    },
    effect: (_action, { getState }) => {
      const state = getState();
      writePersistedStorage(state[sliceOptions.name]);
    },
  });

  startAppListening({
    type: '@@INIT-PERSIST',
    effect: async (_action, { getState }) => {
      const state = getState();
      state[sliceOptions.name] = await getInitialState();
    },
  });

  return {
    ...slice,
    getInitialState,
    listenerMiddleware,
    clearPersistedStorage,
  };
};

export {
  Settings,
  configurePersistedStore,
};
export default createPersistedSlice;
