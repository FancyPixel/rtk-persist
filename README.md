# RTK-persist User Guide

## Commands

```bash
yarn add rtk-persist

or

npm install --save rtk-persist
```

## Configuration
Replace `createSlice` and `configureStore` with `persistSlice` and `configurePersistedStore`.

```typescript
// slice.ts

const slice = persistSlice(...sliceOptions);

// store.ts
const storage = localStorage; // or AsyncStorage on RN
const store = configurePersistedStore(...storeOptions, storage);

```
