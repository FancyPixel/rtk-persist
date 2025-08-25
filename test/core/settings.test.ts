/**
 * @file Test suite for the Settings class.
 * This file ensures that the global settings for the rtk-persist library
 * are managed correctly, including the storage handler, application ID,
 * and slice subscriptions. It also verifies error handling and the behavior
 * of the TestSettings utility.
 */

import Settings, { TestSettings } from '../../src/core/settings';
import { configurePersistedStore } from '../../src/core/store';
import { StorageHandler } from '../../src/core/types';
import { mockPersistedSliceFactory, StorageMock } from './mocks';

describe('Settings', () => {
  let storage: StorageHandler;
  let mockSlice: ReturnType<typeof mockPersistedSliceFactory>;

  beforeEach(() => {
    storage = new StorageMock();
    mockSlice = mockPersistedSliceFactory();
    // Restore settings to a clean state before each test.
    TestSettings.restoreDefaults();
  });

  it('should throw an error when trying to instantiate the static Settings class', () => {
    expect(() => new Settings()).toThrow(
      'The Settings class is a static utility and should not be instantiated.',
    );
  });

  describe('storageHandler', () => {
    it('should correctly set and get the storage handler', () => {
      TestSettings.storageHandler = storage;
      expect(TestSettings.storageHandler).toBe(storage);
    });

    it('should be initialized correctly by configurePersistedStore', async () => {
      await configurePersistedStore(
        {
          reducer: { [mockSlice.name]: mockSlice.reducer },
        },
        'mockApp',
        storage,
      );
      expect(TestSettings.storageHandler).toBe(storage);
    });

    it('should throw a TypeError if accessed before being set', () => {
      expect(() => TestSettings.storageHandler).toThrow(
        'A storage handler must be configured before use.',
      );
    });
  });

  describe('applicationId', () => {
    it('should correctly set and get the application ID', () => {
      TestSettings.applicationId = 'my-app';
      expect(TestSettings.applicationId).toBe('my-app');
    });

    it('should be initialized correctly by configurePersistedStore', async () => {
      await configurePersistedStore(
        {
          reducer: { [mockSlice.name]: mockSlice.reducer },
        },
        'mockApp',
        storage,
      );
      expect(TestSettings.applicationId).toBe('mockApp');
    });

    it('should throw a TypeError if accessed before being set', () => {
      expect(() => TestSettings.applicationId).toThrow(
        'An application ID must be configured before use.',
      );
    });
  });

  describe('Slice Subscription', () => {
    it('should subscribe slices and return the list of subscribed IDs', () => {
      TestSettings.subscribeSlice('user');
      TestSettings.subscribeSlice('posts');
      expect(TestSettings.subscribedSliceIds).toEqual(['user', 'posts']);
    });

    it('should not allow duplicate slice subscriptions', () => {
      TestSettings.subscribeSlice('user');
      TestSettings.subscribeSlice('user'); // Duplicate
      TestSettings.subscribeSlice('posts');
      expect(TestSettings.subscribedSliceIds).toEqual(['user', 'posts']);
    });

    it('should return an empty array when no slices are subscribed', () => {
      expect(TestSettings.subscribedSliceIds).toEqual([]);
    });

    it('should return a copy of the subscribedSliceIds array to ensure immutability', () => {
      TestSettings.subscribeSlice('user');
      const ids = TestSettings.subscribedSliceIds;
      ids.push('posts'); // Mutate the returned array

      // The original settings should remain unchanged.
      expect(TestSettings.subscribedSliceIds).toEqual(['user']);
    });
  });

  describe('TestSettings Utility', () => {
    it('should restore all settings to their default, uninitialized state', () => {
      // Setup: Assign values to all settings.
      TestSettings.storageHandler = storage;
      TestSettings.applicationId = 'my-app';
      TestSettings.subscribeSlice('user');

      // Action: Restore defaults.
      TestSettings.restoreDefaults();

      // Assert: All settings should be reset and throw if accessed.
      expect(() => TestSettings.storageHandler).toThrow();
      expect(() => TestSettings.applicationId).toThrow();
      expect(TestSettings.subscribedSliceIds).toEqual([]);
    });
  });
});
