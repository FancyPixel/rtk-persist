/**
 * @file Test suite for the UpdatedAtHelper utility.
 * This file verifies the core logic for tracking and comparing timestamps to
 * determine if a slice's state needs to be persisted. It covers initialization,
 * state changes, save operations, and concurrency.
 */

import { TestSettings } from '../src/settings';
import UpdatedAtHelper, { TestUpdatedAtHelper } from '../src/updatedAtHelper';
import { StorageMock } from './mocks';

describe('UpdatedAtHelper', () => {
  // Initialize a mock storage handler before any tests run.
  beforeAll(() => {
    TestSettings.storageHandler = new StorageMock();
  });

  // Before each test, clear the cache and use fake timers for isolation.
  beforeEach(() => {
    TestUpdatedAtHelper._clearCache();
    jest.useFakeTimers();
  });

  // Restore real timers after each test.
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Constructor', () => {
    it('should throw an error when trying to instantiate', () => {
      // UpdatedAtHelper is a static utility class and should not be instantiated.
      expect(() => new (UpdatedAtHelper as any)()).toThrow(
        'UpdatedAtHelper is a static class and cannot be instantiated.',
      );
    });
  });

  describe('getStoredUpdatedAtOf', () => {
    it('should return 0 for a slice that has never been tracked', () => {
      // A new slice has no saved data, so its timestamp should default to 0.
      expect(UpdatedAtHelper.getStoredUpdatedAtOf('newSlice')).toBe(0);
    });

    it('should return the timestamp of the last save operation', () => {
      const sliceName = 'testSlice';
      const saveTime = 1000;

      // Simulate a state change and a save at a specific time.
      UpdatedAtHelper.onStateChange(sliceName);
      jest.setSystemTime(new Date(saveTime));
      UpdatedAtHelper.onSave(sliceName);

      // The stored timestamp should match the time of the save.
      expect(UpdatedAtHelper.getStoredUpdatedAtOf(sliceName)).toBe(saveTime);
    });
  });

  describe('shouldSave', () => {
    it('should return false for a new slice with no changes', () => {
      // A slice with no activity should not need to be saved.
      expect(UpdatedAtHelper.shouldSave('newSlice')).toBe(false);
    });

    it('should return true after a state change marks the slice as dirty', () => {
      const sliceName = 'dirtySlice';
      UpdatedAtHelper.onStateChange(sliceName);
      // A "dirty" slice should be saved.
      expect(UpdatedAtHelper.shouldSave(sliceName)).toBe(true);
    });

    it('should return false after a state change has been saved', () => {
      const sliceName = 'savedSlice';
      UpdatedAtHelper.onStateChange(sliceName);
      UpdatedAtHelper.onSave(sliceName); // The state is now synced.
      expect(UpdatedAtHelper.shouldSave(sliceName)).toBe(false);
    });

    it('should return true if state changes again after a save', () => {
      const sliceName = 'reDirtySlice';
      UpdatedAtHelper.onStateChange(sliceName);
      UpdatedAtHelper.onSave(sliceName);
      jest.advanceTimersByTime(10); // Ensure the next timestamp is different.
      UpdatedAtHelper.onStateChange(sliceName); // Mark as dirty again.
      expect(UpdatedAtHelper.shouldSave(sliceName)).toBe(true);
    });

    it('should return false when local and stored timestamps are identical', () => {
      const sliceName = 'syncedSlice';
      const now = new Date().getTime();

      // Manually set timestamps to be identical.
      TestUpdatedAtHelper._setLocalUpdatedAtForTest(sliceName, now);
      TestUpdatedAtHelper._setStoredUpdatedAtForTest(sliceName, now);

      // If timestamps are the same, no save is needed.
      expect(UpdatedAtHelper.shouldSave(sliceName)).toBe(false);
    });
  });

  describe('onSave', () => {
    it('should set the stored timestamp even if the local timestamp is not set', () => {
      const sliceName = 'saveOnlySlice';
      const saveTime = 5000;
      jest.setSystemTime(new Date(saveTime));

      // This can happen during initial rehydration.
      UpdatedAtHelper.onSave(sliceName);

      // No save should be needed as the state is considered synced.
      expect(UpdatedAtHelper.shouldSave(sliceName)).toBe(false);
      // The stored timestamp should be updated.
      expect(UpdatedAtHelper.getStoredUpdatedAtOf(sliceName)).toBe(saveTime);
    });
  });

  describe('Concurrency', () => {
    it('should track multiple slices independently', () => {
      const sliceA = 'sliceA';
      const sliceB = 'sliceB';

      // 1. Change sliceA. It should be marked for saving, but not sliceB.
      UpdatedAtHelper.onStateChange(sliceA);
      expect(UpdatedAtHelper.shouldSave(sliceA)).toBe(true);
      expect(UpdatedAtHelper.shouldSave(sliceB)).toBe(false);

      // 2. Save sliceA. Now neither should need saving.
      UpdatedAtHelper.onSave(sliceA);
      expect(UpdatedAtHelper.shouldSave(sliceA)).toBe(false);
      expect(UpdatedAtHelper.shouldSave(sliceB)).toBe(false);

      // 3. Change sliceB. It should be marked for saving, but not sliceA.
      UpdatedAtHelper.onStateChange(sliceB);
      expect(UpdatedAtHelper.shouldSave(sliceA)).toBe(false);
      expect(UpdatedAtHelper.shouldSave(sliceB)).toBe(true);
    });
  });

  describe('TestUpdatedAtHelper', () => {
    it('should correctly clear the cache', () => {
      TestUpdatedAtHelper._setLocalUpdatedAtForTest('test', 1000);
      TestUpdatedAtHelper._clearCache();
      expect(UpdatedAtHelper.getStoredUpdatedAtOf('test')).toBe(0);
    });

    it('should correctly set the local updated timestamp', () => {
      TestUpdatedAtHelper._setLocalUpdatedAtForTest('test', 12345);
      // Directly access the internal cache to verify.
      expect(
        (UpdatedAtHelper as any).getStoredUpdatedAtOf('test'),
      ).not.toBe(12345);
      expect(UpdatedAtHelper.shouldSave('test')).toBe(true);
    });

    it('should correctly set the stored updated timestamp', () => {
      TestUpdatedAtHelper._setStoredUpdatedAtForTest('test', 54321);
      expect(UpdatedAtHelper.getStoredUpdatedAtOf('test')).toBe(54321);
    });
  });
});
