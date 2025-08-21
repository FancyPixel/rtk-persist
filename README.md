# rtk-persist

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**`rtk-persist`** is a lightweight, zero-dependency library that enhances Redux Toolkit's state management by adding seamless, persistent storage. It allows specified slices or reducers of your Redux state to be saved to a storage medium of your choice (like `localStorage` or `AsyncStorage`) and rehydrated on app startup.

The library works by wrapping standard Redux Toolkit functions, adding persistence logic without changing the way you write your reducers or actions.

<br />

## ✨ Features

* **Effortless Persistence**: Persist any Redux Toolkit slice or reducer with minimal configuration.

* **Flexible API**: Choose between a `createPersistedSlice` utility or a `createPersistedReducer` builder syntax.

* **Storage Agnostic**: Works with any storage provider that implements a simple `getItem`, `setItem`, and `removeItem` interface.

* **Rehydration Lifecycle**: Use optional callbacks (`onRehydrationStart`, `onRehydrationSuccess`, `onRehydrationError`) to react to the persistence lifecycle.

* **TypeScript Support**: Fully typed to ensure a great developer experience.

* **Minimal Footprint**: Extremely lightweight with a production size under 10 KB.

<br />

## ⚙️ Installation

You can install `rtk-persist` using either `yarn` or `npm`:

```
yarn add rtk-persist
```

or

```
npm install --save rtk-persist
```

The package has a peer dependency on `@reduxjs/toolkit`.

<br />

## 🚀 Quick Start

`rtk-persist` offers two ways to make your state persistent. Both require using `configurePersistedStore` in your store setup.

### Option 1: Using `createPersistedSlice`

This approach is best if you prefer the `createSlice` API from Redux Toolkit.

#### 1. Create the Slice

Replace `createSlice` with `createPersistedSlice`. The function accepts the same options.

```
// features/counter/counterSlice.ts
import { createPersistedSlice } from 'rtk-persist';
import { PayloadAction } from '@reduxjs/toolkit';

export const counterSlice = createPersistedSlice({
  name: 'counter',
  initialState: {
    value: 0,
  },
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload;
    },
  },
});

export const { increment, decrement, incrementByAmount } = counterSlice.actions;
export default counterSlice.reducer;
```

### Option 2: Using `createPersistedReducer`

This approach is ideal if you prefer the `createReducer` builder syntax.

#### 1. Create the Reducer

Use `createPersistedReducer` and define your case reducers using the builder callback.

```
// features/counter/counterReducer.ts
import { createPersistedReducer } from 'rtk-persist';
import { createAction } from '@reduxjs/toolkit';

const increment = createAction<number>('increment');
const decrement = createAction<number>('decrement');

export const reducer = createPersistedReducer(
  'counter', // A unique name for the reducer
  { value: 0 }, // Initial state
  (builder) => {
    builder
      .addCase(increment, (state, action) => {
        state.value += action.payload;
      })
      .addCase(decrement, (state, action) => {
        state.value -= action.payload;
      });
  }
);
```

### 2. Configure the Store

Whichever option you choose, you must use `configurePersistedStore` and provide a storage handler. The store is created synchronously, and rehydration from storage happens in the background.

```
// app/store.ts
import { configurePersistedStore } from 'rtk-persist';
// Import your slice reducer (Option 1)
import counterSliceReducer from '../features/counter/counterSlice';
// OR import your persisted reducer (Option 2)
import { reducer as counterReducer } from '../features/counter/counterReducer';

// For web, use localStorage or sessionStorage
const storage = localStorage;

// For React Native, you would use:
// import AsyncStorage from '@react-native-async-storage/async-storage';
// const storage = AsyncStorage;

export const store = configurePersistedStore(
  {
    reducer: {
      // For Option 1 (createPersistedSlice)
      counter: counterSliceReducer,

      // For Option 2 (createPersistedReducer)
      // counter: counterReducer,
    },
  },
  'applicationId',
  storage,
  {
    onRehydrationStart: () => console.log('Rehydration started...'),
    onRehydrationSuccess: () => console.log('Rehydration successful!'),
    onRehydrationError: (error) => console.error('Rehydration failed:', error),
  }
);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

<br />

## 🛠️ API

### `createPersistedSlice(sliceOptions)`

A wrapper around RTK's `createSlice`.

* **`sliceOptions`**: The standard `CreateSliceOptions` object.

### `createPersistedReducer(name, initialState, builderCallback)`

A wrapper around RTK's `createReducer`.

* **`name`**: A unique string to identify this reducer in storage.

* **`initialState`**: The initial state for the reducer.

* **`builderCallback`**: A callback that receives a `builder` object to define case reducers.

### `configurePersistedStore(storeOptions, applicationId, storageHandler, persistenceOptions?)`

A wrapper around RTK's `configureStore`.

* **`storeOptions`**: The standard `ConfigureStoreOptions` object.

* **`applicationId`**: A unique string that identifies the application.

* **`storageHandler`**: A storage object that implements `getItem`, `setItem`, and `removeItem`.

* **`persistenceOptions`** (optional): An object to control the persistence behavior:

  * `rehydrationTimeout` (optional, `number`): The maximum time in milliseconds to wait for rehydration to complete before timing out. Defaults to `5000`.

  * `onRehydrationStart` (optional, `() => void`): A callback invoked when the rehydration process begins.

  * `onRehydrationSuccess` (optional, `() => void`): A callback invoked when the rehydration process completes successfully.

  * `onRehydrationError` (optional, `(error: unknown) => void`): A callback invoked if an error occurs during rehydration.

<br />

## ❤️ Author

This library is authored and maintained by [**Fancy Pixel srl**](https://www.fancypixel.it).

This library was crafted from our daily experiences building modern web and mobile applications. Contributions are welcome!

<br />

## 📄 License

This project is licensed under the MIT License.
        