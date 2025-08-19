import { configurePersistedStore } from "../src";
import { TestSettings as Settings } from '../src/settings';
import { StorageHandler } from "../src/types";
import { mockPersistedSlice, StorageMock } from "./mocks";

describe('Settings', () => {
  let storage: StorageHandler;

  // Before each test, create a new storage mock and clear all global settings
  // to ensure tests are isolated.
  beforeEach(() => {
    storage = new StorageMock();
    Settings._clearSettings();
  });

  describe('storageHandler', () => {
    it('should allow setting and getting the storage handler', () => {
      Settings.storageHandler = storage;
      expect(Settings.storageHandler).toBe(storage);
    });

    it('should be initialized by configurePersistedStore', async () => {
      await configurePersistedStore({
        reducer: ({ [mockPersistedSlice.name]: mockPersistedSlice.reducer }),
      }, 'mockApp', storage);
      expect(Settings.storageHandler).toBe(storage);
    });

    it('should throw a TypeError if accessed before being set', () => {
      expect(() => Settings.storageHandler).toThrow(TypeError);
    });
  });

  describe('applicationId', () => {
    it('should allow setting and getting the application ID', () => {
      Settings.applicationId = 'my-app';
      expect(Settings.applicationId).toBe('my-app');
    });

    it('should be initialized by configurePersistedStore', async () => {
      await configurePersistedStore({
        reducer: ({ [mockPersistedSlice.name]: mockPersistedSlice.reducer }),
      }, 'mockApp', storage);
      expect(Settings.applicationId).toBe('mockApp');
    });

    it('should throw a TypeError if accessed before being set', () => {
      expect(() => Settings.applicationId).toThrow(TypeError);
    });
  });

  describe('slice subscription', () => {
    it('should allow subscribing slices and retrieving the list', () => {
      Settings.subscribeSlice('user');
      Settings.subscribeSlice('posts');
      expect(Settings.subscribedSliceIds).toEqual(['user', 'posts']);
    });

    it('should not allow duplicate slice subscriptions', () => {
      Settings.subscribeSlice('user');
      Settings.subscribeSlice('user');
      Settings.subscribeSlice('posts');
      expect(Settings.subscribedSliceIds).toEqual(['user', 'posts']);
    });

    it('should be cleared by _clearSettings', () => {
      Settings.subscribeSlice('user');
      expect(Settings.subscribedSliceIds).toEqual(['user']);
      Settings._clearSettings();
      expect(Settings.subscribedSliceIds).toEqual([]);
    });
  });

  describe('persistence pause and resume', () => {
    it('should be enabled by default', () => {
      expect(Settings.isPersistenceEnabled).toBe(true);
    });

    it('should allow pausing persistence', () => {
      Settings.pause();
      expect(Settings.isPersistenceEnabled).toBe(false);
    });

    it('should allow resuming persistence after being paused', () => {
      Settings.pause();
      expect(Settings.isPersistenceEnabled).toBe(false);
      Settings.resume();
      expect(Settings.isPersistenceEnabled).toBe(true);
    });

    it('should be reset to enabled when settings are cleared', () => {
      Settings.pause();
      expect(Settings.isPersistenceEnabled).toBe(false);
      Settings._clearSettings();
      expect(Settings.isPersistenceEnabled).toBe(true);
    });
  });
});
