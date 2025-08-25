# rtk-persist

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**`rtk-persist`** is a lightweight, zero-dependency library that enhances Redux Toolkit's state management by adding seamless, persistent storage. It allows specified slices or reducers of your Redux state to be saved to a storage medium of your choice (like `localStorage` or `AsyncStorage`) and rehydrated on app startup.

The library works by wrapping standard Redux Toolkit functions, adding persistence logic without changing the way you write your reducers or actions.

<br />

## ✨ Features

* **Effortless Persistence**: Persist any Redux Toolkit slice or reducer with minimal configuration.
* **Seamless Integration**: Designed as a drop-in replacement for RTK functions. Adding or removing persistence is as simple as changing an import.
* **Flexible API**: Choose between a `createPersistedSlice` utility or a `createPersistedReducer` builder syntax.
* **Nested State Support**: Easily persist slices or reducers that are deeply nested within your root state using a simple `nestedPath` option.
* **Storage Agnostic**: Works with any storage provider that implements a simple `getItem`, `setItem`, and `removeItem` interface.
* **Rehydration Lifecycle**: Use optional callbacks (`onRehydrationStart`, `onRehydrationSuccess`, `onRehydrationError`) to react to the persistence lifecycle.
* **TypeScript Support**: Fully typed to ensure a great developer experience with path validation.
* **Minimal Footprint**: Extremely lightweight with a production size under 10 KB.

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

The package has a peer dependency on `@reduxjs/toolkit`.

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

Whichever option you choose, you must use `configurePersistedStore` and provide a storage handler. The store is created synchronously, and rehydration from storage happens in the background.

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

## ↔️ Seamless Integration

A core design principle of `rtk-persist` is that it should be easy to add or remove. The API is intentionally designed to mirror Redux Toolkit's, so enabling or disabling persistence is as simple as changing an import.

**From this:**

```typescript
import { createSlice } from '@reduxjs/toolkit';

export const counterSlice = createSlice({
  /* ... */
});
```

**To this:**

```typescript
import { createPersistedSlice } from 'rtk-persist';

export const counterSlice = createPersistedSlice({
  /* ... */
});
```

No other code changes are needed in your slice file.

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
  'features.counter' // The nestedPath to the slice's state
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

## 🛠️ API

### `createPersistedSlice`

A wrapper around RTK's `createSlice` that adds persistence.

#### Takes

* **`sliceOptions`**: The standard `CreateSliceOptions` object from Redux Toolkit.
* **`nestedPath`** (optional, `string`): A dot-notation string representing the path to the slice's state from the root. Required if the slice is not at the root level.

#### Returns

* A standard `Slice` object, enhanced with a `nestedPath` property.

---

### `createPersistedReducer`

A wrapper around RTK's `createReducer` that adds persistence.

#### Takes

* **`name`**: A unique string to identify this reducer in storage.
* **`initialState`**: The initial state for the reducer.
* **`builderCallback`**: A callback that receives a `builder` object to define case reducers.
* **`nestedPath`** (optional, `string`): A dot-notation string representing the path to the reducer's state. An empty string (`''`) signifies that this reducer is the root state.

#### Returns

* A standard `Reducer` function, enhanced with `reducerName` and `nestedPath` properties.

---

### `configurePersistedStore`

A wrapper around RTK's `configureStore`.

#### Takes

* **`storeOptions`**: The standard `ConfigureStoreOptions` object.
* **`applicationId`**: A unique string that identifies the application to namespace storage keys.
* **`storageHandler`**: A storage object that implements `getItem`, `setItem`, and `removeItem`.
* **`persistenceOptions`** (optional): An object to control the persistence behavior:
    * `rehydrationTimeout` (optional, `number`): Max time in ms to wait for rehydration. Defaults to `5000`.
    * `onRehydrationStart` (optional, `() => void`): Callback invoked when rehydration begins.
    * `onRehydrationSuccess` (optional, `() => void`): Callback invoked on successful rehydration.
    * `onRehydrationError` (optional, `(error: unknown) => void`): Callback invoked on rehydration error.

#### Returns

* A `PersistedStore` object, which is a standard Redux store enhanced with the following methods:
    * **`rehydrate()`**: A function to manually trigger rehydration from storage.
    * **`clearPersistedState()`**: A function that clears all persisted data for the application from storage.

<br />

## ❤️ Author

This library is authored and maintained by [**Fancy Pixel srl**](https://www.fancypixel.it).

This library was crafted from our daily experiences building modern web and mobile applications. Contributions are welcome!

<br />

## 📄 License

This project is licensed under the MIT License.
      