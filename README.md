<br />

<div align="center">
<img src="./assets/logo-full.png" height="200px" alt="rtk-persist logo" />
</div>

<br />

# RTK Persist: Your State Persistence, Your Rules [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT) ![GitHub package.json version](https://img.shields.io/github/package-json/v/FancyPixel/rtk-persist?color=%2332C553)

**`rtk-persist`** is a lightweight, zero-dependency library that enhances Redux Toolkit's state management by adding seamless, persistent storage. It allows specified slices or reducers of your Redux state to be saved to a storage medium of your choice (like `localStorage` or `AsyncStorage`) and rehydrated on app startup.

The library works by wrapping standard Redux Toolkit functions, adding persistence logic without changing the way you write your reducers or actions.

<br />

## ✨ Features

* **Effortless Persistence**: Persist any Redux Toolkit slice or reducer with minimal configuration.

* **Asynchronous Rehydration**: Store creation is now asynchronous, ensuring that your app only renders after the state has been fully rehydrated.

* **Seamless Integration**: Designed as a drop-in replacement for RTK functions. Adding or removing persistence is as simple as changing an import.

* **React Redux Integration**: Comes with a `<PersistedProvider />` and a `usePersistedStore` hook for easy integration with React applications.

* **Flexible API**: Choose between a `createPersistedSlice` utility or a `createPersistedReducer` builder syntax.

* **Nested State Support**: Easily persist slices or reducers that are deeply nested within your root state using a simple `nestedPath` option.

* **Custom Serialization**: Use `onPersist` and `onRehydrate` to transform your state before saving and after loading.

* **Storage Agnostic**: Works with any storage provider that implements a simple `getItem`, `setItem`, and `removeItem` interface.

* **TypeScript Support**: Fully typed to ensure a great developer experience with path validation.

* **Minimal Footprint**: Extremely lightweight with a production size under 15 KB.

<br />

## ⚙️ Installation

You can install `rtk-persist` using either `yarn` or `npm`:

```bash
yarn add rtk-persist
```

or

```bash
npm install --save rtk-persist
```

The package has a peer dependency on `@reduxjs/toolkit` and `react-redux` if you use the React integration.

<br />

## 🚀 Quick Start

`rtk-persist` offers two ways to make your state persistent. Both require using `configurePersistedStore` in your store setup.

### Option 1: Using `createPersistedSlice`

This approach is best if you prefer the `createSlice` API from Redux Toolkit.

#### 1. Create the Slice

Replace `createSlice` with `createPersistedSlice`. The function accepts the same options.

```typescript
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

```typescript
// features/counter/counterReducer.ts
import { createPersistedReducer } from 'rtk-persist';
import { createAction } from '@reduxjs/toolkit';

const increment = createAction<number>('increment');
const decrement = createAction<number>('decrement');

export const counterReducer = createPersistedReducer(
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

Whichever option you choose, you must use `configurePersistedStore` and provide a storage handler. The store creation is **asynchronous** and returns a promise that resolves with the rehydrated store.

```typescript
// app/store.ts
import { configurePersistedStore } from 'rtk-persist';
import { counterSlice } from '../features/counter/counterSlice';
// import { counterReducer } from '../features/counter/counterReducer';

// For web, use localStorage or sessionStorage
const storage = localStorage;

export const store = configurePersistedStore(
  {
    reducer: {
      // IMPORTANT: The key must match the slice's `name` or the reducer's `name`.
      [counterSlice.name]: counterSlice.reducer,
      // [counterReducer.reducerName]: counterReducer,
    },
  },
  'my-app-id', // A unique ID for your application
  storage
);

// Note: RootState and AppDispatch types need to be inferred differently
// due to the asynchronous nature of the store.
// This is typically handled within your React application setup.
export type Store = Awaited<typeof store>;
export type RootState = ReturnType<Store['getState']>;
export type AppDispatch = Store['dispatch'];

```

<br />

## ⚛️ React Redux Integration

For React applications, `rtk-persist` provides a `PersistedProvider` and a `usePersistedStore` hook to make integration seamless.

### `PersistedProvider`

This component replaces the standard `Provider` from `react-redux`. It waits for the store to be rehydrated before rendering your application, preventing any flicker of initial state.

#### Usage

In your application's entry point (e.g., `main.tsx` or `index.js`), wrap your `App` component with `PersistedProvider`.

```typescript
// main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { PersistedProvider } from 'rtk-persist';
import { store } from './state/store'; // This is the promise from configurePersistedStore

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistedProvider store={store} loader={<div>Loading...</div>}>
      <App />
    </PersistedProvider>
  </React.StrictMode>,
);

```

The `PersistedProvider` accepts two props:

* `store`: The promise returned by `configurePersistedStore`.

* `loader` (optional): A React node to display while the store is rehydrating.

### `usePersistedStore`

A custom hook that provides access to the rehydrated store instance. This is useful for dispatching actions or accessing store methods.

#### Usage

```typescript
import React from 'react';
import { usePersistedStore } from 'rtk-persist';

const MyComponent = () => {
  const { store } = usePersistedStore();

  const handleClear = () => {
    // Manually clears the persisted state from storage.
    store.clearPersistedState();
  };

  return <button onClick={handleClear}>Clear Persisted State</button>;
};

```

<br />

## 🌳 Handling Nested State

If your persisted slice or reducer is not at the root of your state object, you must provide a `nestedPath` to ensure it can be found for persistence and rehydration.

The `nestedPath` is a dot-notation string representing the path from the root of the state to the slice.

### Example with `nestedPath`

Imagine your state is structured like `{ features: { counter: { value: 0 } } }`. Here's how you would configure the counter slice:

```typescript
// features/counter/counterSlice.ts
export const counterSlice = createPersistedSlice(
  {
    name: 'counter',
    initialState: { value: 0 },
    reducers: {
      /* ... */
    },
  },
  {
    nestedPath: 'features.counter' // The nestedPath to the slice's state
  }
);

// app/store.ts
import { combineReducers } from '@reduxjs/toolkit';
import { configurePersistedStore } from 'rtk-persist';
import { counterSlice } from '../features/counter/counterSlice';

const featuresReducer = combineReducers({
  [counterSlice.name]: counterSlice.reducer,
});

export const store = configurePersistedStore(
  {
    reducer: {
      features: featuresReducer,
    },
  },
  'my-app-id',
  localStorage
);

```

<br />

## 🔬 Advanced Usage: Custom Serialization

Sometimes, you may need to transform a slice's state before it's saved to storage or after it's rehydrated. For example, you might want to store a `Date` object as an ISO string, or omit certain transient properties.

`rtk-persist` supports this through the `onPersist` and `onRehydrate` options.

### Example with `onPersist` and `onRehydrate`

Here's how you can persist a slice that contains a non-serializable value like a `Date` object.

```typescript
// features/session/sessionSlice.ts
import { createPersistedSlice } from 'rtk-persist';

interface SessionState {
  lastLogin: Date | null;
  token: string | null;
}

const initialState: SessionState = {
  lastLogin: null,
  token: null,
};

export const sessionSlice = createPersistedSlice(
  {
    name: 'session',
    initialState,
    reducers: {
      login: (state, action) => {
        state.token = action.payload.token;
        state.lastLogin = new Date();
      },
      logout: (state) => {
        state.token = null;
        state.lastLogin = null;
      },
    },
  },
  {
    // Transform state before saving
    onPersist: (state) => ({
      ...state,
      lastLogin: state.lastLogin ? state.lastLogin.toISOString() : null,
    }),
    // Transform state after rehydrating
    onRehydrate: (state) => ({
      ...state,
      lastLogin: state.lastLogin ? new Date(state.lastLogin) : null,
    }),
  }
);

```

In this example:

* `onPersist` converts the `lastLogin` `Date` object into an ISO string before it's written to `localStorage`.

* `onRehydrate` parses the ISO string and converts it back into a `Date` object when the state is loaded from storage.

<br />

## 🛠️ API

### `createPersistedSlice`

A wrapper around RTK's `createSlice` that adds persistence.

#### Takes

* **`sliceOptions`**: The standard `CreateSliceOptions` object from Redux Toolkit.

* **`persistenceOptions`** (optional, `object`): Configuration for persistence behavior.

  * `nestedPath` (optional, `string`): A dot-notation string for the slice's state if it's nested.

  * `onPersist` (optional, `function`): A function to transform state *before* it's saved.

  * `onRehydrate` (optional, `function`): A function to transform state *after* it's rehydrated.

#### Returns

* A `PersistedSlice` object, which is a standard `Slice` object enhanced with persistence properties.

### `createPersistedReducer`

A wrapper around RTK's `createReducer` that adds persistence.

#### Takes

* **`name`**: A unique string to identify this reducer in storage.

* **`initialState`**: The initial state for the reducer.

* **`builderCallback`**: A callback that receives a `builder` object to define case reducers.

* **`persistenceOptions`** (optional, `object`): Configuration for persistence behavior.

  * `nestedPath` (optional, `string`): A dot-notation string for the reducer's state. An empty string (`''`) signifies the root state.

  * `onPersist` (optional, `function`): A function to transform state *before* it's saved.

  * `onRehydrate` (optional, `function`): A function to transform state *after* it's rehydrated.

#### Returns

* A `PersistedReducer` function, which is a standard `Reducer` enhanced with persistence properties.

### `configurePersistedStore`

A wrapper around RTK's `configureStore`.

#### Takes

* **`storeOptions`**: The standard `ConfigureStoreOptions` object.

* **`applicationId`**: A unique string that identifies the application to namespace storage keys.

* **`storageHandler`**: A storage object that implements `getItem`, `setItem`, and `removeItem`.

* **`persistenceOptions`** (optional): An object to control the persistence behavior:

  * `rehydrationTimeout` (optional, `number`): Max time in ms to wait for rehydration. Defaults to `5000`.

#### Returns

* A `Promise<PersistedStore>` object, which resolves to a standard Redux store enhanced with the following methods:

  * **`rehydrate()`**: A function to manually trigger rehydration from storage.

  * **`clearPersistedState()`**: A function that clears all persisted data for the application from storage.

<br />

## ❤️ Author

This library is authored and maintained by [**Fancy Pixel srl**](https://www.fancypixel.it).

This library was crafted from our daily experiences building modern web and mobile applications. Contributions are welcome!

<br />

## 📄 License

This project is licensed under the MIT License.

Library icon freely created from a [iconsax](https://iconsax.io/) icon and the [redux](https://redux.js.org/img/redux.svg) logo.
