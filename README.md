# rtk-persist

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**`rtk-persist`** is a lightweight, zero-dependency library that enhances Redux Toolkit's state management by adding seamless, persistent storage. It allows specified slices of your Redux state to be saved to a storage medium of your choice (like `localStorage` or `AsyncStorage`) and rehydrated on app startup.

The library works by wrapping the standard Redux Toolkit `createSlice` and `configureStore` functions, adding persistence logic without changing the way you write your reducers or actions.

***

## ✨ Features

* **Effortless Persistence**: Persist any Redux Toolkit slice with minimal configuration.
* **Storage Agnostic**: Works with any storage provider that implements a simple `getItem`, `setItem`, and `removeItem` interface, including `localStorage`, `sessionStorage`, and React Native's `AsyncStorage`.
* **Selective Persistence**: An optional filter function allows you to specify exactly which parts of a slice's state should be persisted, giving you fine-grained control.
* **TypeScript Support**: Fully typed to ensure a great developer experience with autocompletion and type safety.
* **Minimal Footprint**: Extremely lightweight with a production size under 10 KB.

***

## ⚙️ Installation

You can install `rtk-persist` using either `npm` or `yarn`:
```bash
npm install --save rtk-persist
```

or
```bash
yarn add rtk-persist
```

The package has a peer dependency on `@reduxjs/toolkit`.

***

## 🚀 Quick Start

To make a slice persistent, you need to use `createPersistedSlice` instead of `createSlice` and `configurePersistedStore` instead of `configureStore`.

### 1. Update your Slice

Replace `createSlice` with `createPersistedSlice`. The function accepts the same options.

```typescript
// features/counter/counterSlice.ts

import { createPersistedSlice } from 'rtk-persist';
import { PayloadAction } from '@reduxjs/toolkit';

// Define your slice options as you normally would
const counterSliceOptions = {
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
};

// Create the persisted slice
export const counterSlice = createPersistedSlice(counterSliceOptions);

export const { increment, decrement, incrementByAmount } = counterSlice.actions;

export default counterSlice.reducer;
```

### 2. Configure your Store

In your store setup, replace `configureStore` with `configurePersistedStore` and pass a storage handler as the second argument. The storage handler can be `localStorage`, `sessionStorage`, or `AsyncStorage` for React Native.

```typescript
// app/store.ts

import { configurePersistedStore } from 'rtk-persist';
import counterReducer from '../features/counter/counterSlice';

// For web, use localStorage or sessionStorage
const storage = localStorage;

// For React Native, you would use:
// import AsyncStorage from '@react-native-async-storage/async-storage';
// const storage = AsyncStorage;

export const store = configurePersistedStore(
  {
    reducer: {
      counter: counterReducer,
    },
  },
  storage
);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

And that's it! The `counter` slice will now be automatically saved on every change and rehydrated when the app loads.

***

## 🛠️ API

### `createPersistedSlice(sliceOptions, [filterFunction])`

A wrapper around RTK's `createSlice` that adds persistence capabilities.

* **`sliceOptions`**: The standard `CreateSliceOptions` object from Redux Toolkit.
* **`filterFunction`** (optional): A function that receives the slice's state and returns a partial state object. Only the properties in the returned object will be persisted.

### `configurePersistedStore(storeOptions, storageHandler)`

A wrapper around RTK's `configureStore` that enables the persistence logic.

* **`storeOptions`**: The standard `ConfigureStoreOptions` object from Redux Toolkit.
* **`storageHandler`**: A storage object that implements `getItem`, `setItem`, and `removeItem`. It must conform to the `StorageHandler` interface.

***

## 📄 License

This project is licensed under the MIT License.