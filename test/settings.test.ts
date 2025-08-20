import { configurePersistedStore } from '../src';
import Settings, { TestSettings } from '../src/settings';
import { StorageHandler } from '../src/types';
import { mockPersistedSliceFactory, StorageMock } from './mocks';

describe('Settings', () => {
  let storage: StorageHandler;
  let mockSlice: ReturnType<typeof mockPersistedSliceFactory>;

  beforeEach(() => {
    storage = new StorageMock();
    mockSlice = mockPersistedSliceFactory();
    TestSettings.restoreDefaults();
  });

  it('should throw an error when trying to instantiate', () => {
    expect(() => new Settings()).toThrow(
      'This class is not meant to be instantiated.',
    );
  });

  describe('storageHandler', () => {
    it('should set and get the storage handler correctly', () => {
      TestSettings.storageHandler = storage;
      expect(TestSettings.storageHandler).toBe(storage);
    });

    it('should be initialized by configurePersistedStore', async () => {
      await configurePersistedStore(
        {
          reducer: { [mockSlice.name]: mockSlice.reducer },
        },
        'mockApp',
        storage,
      );
      expect(TestSettings.storageHandler).toBe(storage);
    });

    it('should throw a TypeError if the storage handler is accessed before being set', () => {
      expect(() => TestSettings.storageHandler).toThrow(
        'The default storage handler must be set.',
      );
    });
  });

  describe('applicationId', () => {
    it('should set and get the application ID correctly', () => {
      TestSettings.applicationId = 'my-app';
      expect(TestSettings.applicationId).toBe('my-app');
    });

    it('should be initialized by configurePersistedStore', async () => {
      await configurePersistedStore(
        {
          reducer: { [mockSlice.name]: mockSlice.reducer },
        },
        'mockApp',
        storage,
      );
      expect(TestSettings.applicationId).toBe('mockApp');
    });

    it('should throw a TypeError if the application ID is accessed before being set', () => {
      expect(() => TestSettings.applicationId).toThrow(
        'The storage ID must be set.',
      );
    });
  });

  describe('slice subscription', () => {
    it('should subscribe slices and return the list of subscribed slice IDs', () => {
      TestSettings.subscribeSlice('user');
      TestSettings.subscribeSlice('posts');
      expect(TestSettings.subscribedSliceIds).toEqual(['user', 'posts']);
    });

    it('should not allow duplicate slice subscriptions', () => {
      TestSettings.subscribeSlice('user');
      TestSettings.subscribeSlice('user');
      TestSettings.subscribeSlice('posts');
      expect(TestSettings.subscribedSliceIds).toEqual(['user', 'posts']);
    });

    it('should return an empty array when no slices are subscribed', () => {
      expect(TestSettings.subscribedSliceIds).toEqual([]);
    });
  });

  describe('TestSettings', () => {
    it('should restore all settings to their default state', () => {
      TestSettings.storageHandler = storage;
      TestSettings.applicationId = 'my-app';
      TestSettings.subscribeSlice('user');

      TestSettings.restoreDefaults();

      expect(() => TestSettings.storageHandler).toThrow();
      expect(() => TestSettings.applicationId).toThrow();
      expect(TestSettings.subscribedSliceIds).toEqual([]);
    });
  });
});
