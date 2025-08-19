/**
 * @module rtk-persist
 * @description This is the main entry point for the rtk-persist library.
 * It exports the core functions needed to add persistence capabilities
 * to a Redux Toolkit application.
 */
import { createPersistedReducer } from './reducer';
import { createPersistedSlice } from "./slice";
import { configurePersistedStore } from "./store";

export {
  configurePersistedStore,
  createPersistedReducer,
  createPersistedSlice
};
