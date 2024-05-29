import { configurePersistedStore } from "../src";
import { TestSettings as Settings } from '../src/settings';
import { mockPersistedSlice, mockStorageHandler } from "./mocks";

describe('Global settings', () => {
  beforeEach(() => {
    Settings._clearSettings();
  });
  it('should allow to get and set static variables', () => {
    Settings.storageHandler = mockStorageHandler;
    expect(Settings.storageHandler).toEqual(mockStorageHandler);
  });

  it('should be initiated when configuring a store', () => {
    configurePersistedStore({
      reducer: ({ [mockPersistedSlice.name]: mockPersistedSlice.reducer }),
    }, mockStorageHandler);
    expect(Settings.storageHandler).toEqual(mockStorageHandler);
  });

  it('should throw an exception when requesting variables not set', () => {
    expect(() => Settings.storageHandler).toThrow(TypeError);
  });
});