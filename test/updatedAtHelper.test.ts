import { TestSettings } from '../src/settings';
import UpdatedAtHelper, { TestUpdatedAtHelper } from '../src/updatedAtHelper';
import { StorageMock } from './mocks';

describe('UpdatedAtHelper', () => {
  // Initialize a mock storage handler before any tests run.
  beforeAll(() => {
    TestSettings.storageHandler = new StorageMock();
  });

  // Before each test, clear the cache to ensure test isolation.
  beforeEach(() => {
    TestUpdatedAtHelper._clearCache();
    // Use fake timers to control time-based operations like timestamps.
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Restore real timers after each test.
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should throw an error when trying to instantiate', () => {
      // UpdatedAtHelper is a static utility class and should not be instantiated.
      expect(() => new (UpdatedAtHelper as any)()).toThrow(
        'UpdatedAtHelper is a static class and cannot be instantiated.',
      );
    });
  });

  describe('getStoredUpdateAtOf', () => {
    it('should return 0 for a slice that has never been tracked', async () => {
      // For a new slice, there's no saved data, so the timestamp should be 0.
      expect(await UpdatedAtHelper.getStoredUpdateAtOf('newSlice')).toBe(0);
    });

    it('should return the timestamp of the last save', async () => {
      const sliceName = 'testSlice';
      const saveTime = 1000;

      // Simulate a state change and a save operation at a specific time.
      UpdatedAtHelper.onStateChange(sliceName);
      jest.setSystemTime(new Date(saveTime));
      UpdatedAtHelper.onSave(sliceName);

      // The stored timestamp should match the time of the save.
      expect(await UpdatedAtHelper.getStoredUpdateAtOf(sliceName)).toBe(
        saveTime,
      );
    });
  });

  describe('shouldSave', () => {
    it('should return false for a new slice with no changes', async () => {
      // A slice with no activity shouldn't need to be saved.
      expect(await UpdatedAtHelper.shouldSave('newSlice')).toBe(false);
    });

    it('should return true after a state change', async () => {
      const sliceName = 'dirtySlice';
      // A state change marks the slice as "dirty".
      UpdatedAtHelper.onStateChange(sliceName);
      // A "dirty" slice should be saved.
      expect(await UpdatedAtHelper.shouldSave(sliceName)).toBe(true);
    });

    it('should return false after a state change is saved', async () => {
      const sliceName = 'savedSlice';
      UpdatedAtHelper.onStateChange(sliceName);
      // After saving, the stored state matches the local state.
      UpdatedAtHelper.onSave(sliceName);
      expect(await UpdatedAtHelper.shouldSave(sliceName)).toBe(false);
    });

    it('should return true if state changes again after a save', async () => {
      const sliceName = 'reDirtySlice';
      UpdatedAtHelper.onStateChange(sliceName);
      UpdatedAtHelper.onSave(sliceName);
      // A new change makes the slice "dirty" again.
      jest.advanceTimersByTime(10); // Ensure the timestamp is different
      UpdatedAtHelper.onStateChange(sliceName);
      expect(await UpdatedAtHelper.shouldSave(sliceName)).toBe(true);
    });

    it('should return false when local and stored timestamps are identical', async () => {
      const sliceName = 'syncedSlice';
      const now = new Date().getTime();

      // Manually set timestamps to be identical for this test case.
      TestUpdatedAtHelper._setLocalUpdatedAtForTest(sliceName, now);
      TestUpdatedAtHelper._setStoredUpdatedAtForTest(sliceName, now);

      // If timestamps are the same, no save is needed.
      expect(await UpdatedAtHelper.shouldSave(sliceName)).toBe(false);
    });
  });

  describe('onSave', () => {
    it('should set stored timestamp if local is not set', async () => {
      const sliceName = 'saveOnlySlice';
      const saveTime = 5000;
      jest.setSystemTime(new Date(saveTime));

      // Calling onSave without a prior onStateChange.
      // This can happen during initial hydration.
      UpdatedAtHelper.onSave(sliceName);

      // No save should be needed as the state is considered synced.
      expect(await UpdatedAtHelper.shouldSave(sliceName)).toBe(false);
      // The stored timestamp should be updated.
      expect(await UpdatedAtHelper.getStoredUpdateAtOf(sliceName)).toBe(
        saveTime,
      );
    });
  });

  describe('concurrency', () => {
    it('should track multiple slices independently', async () => {
      const sliceA = 'sliceA';
      const sliceB = 'sliceB';

      // 1. Change sliceA. It should be marked for saving, but not sliceB.
      UpdatedAtHelper.onStateChange(sliceA);
      expect(await UpdatedAtHelper.shouldSave(sliceA)).toBe(true);
      expect(await UpdatedAtHelper.shouldSave(sliceB)).toBe(false);

      // 2. Save sliceA. Now neither should need saving.
      UpdatedAtHelper.onSave(sliceA);
      expect(await UpdatedAtHelper.shouldSave(sliceA)).toBe(false);
      expect(await UpdatedAtHelper.shouldSave(sliceB)).toBe(false);

      // 3. Change sliceB. It should be marked for saving, but not sliceA.
      UpdatedAtHelper.onStateChange(sliceB);
      expect(await UpdatedAtHelper.shouldSave(sliceA)).toBe(false);
      expect(await UpdatedAtHelper.shouldSave(sliceB)).toBe(true);
    });
  });

  describe('time progression', () => {
    it('should correctly handle sequences of changes and saves over time', async () => {
      const sliceName = 'timeSlice';

      // At T=0, no save is needed.
      expect(await UpdatedAtHelper.shouldSave(sliceName)).toBe(false);

      // At T=1000, state changes. A save is now needed.
      jest.advanceTimersByTime(1000);
      UpdatedAtHelper.onStateChange(sliceName); // localUpdatedAt = 1000
      expect(await UpdatedAtHelper.shouldSave(sliceName)).toBe(true);

      // At T=2000, state is saved. No save is needed.
      jest.advanceTimersByTime(1000);
      UpdatedAtHelper.onSave(sliceName); // storedUpdatedAt = 2000, localUpdatedAt = 1000
      expect(await UpdatedAtHelper.shouldSave(sliceName)).toBe(false);

      // At T=3000, another state change occurs. A save is needed again.
      jest.advanceTimersByTime(1000);
      UpdatedAtHelper.onStateChange(sliceName); // localUpdatedAt = 3000, storedUpdatedAt = 2000
      expect(await UpdatedAtHelper.shouldSave(sliceName)).toBe(true);

      // At T=4000, another state change occurs before a save operation completes.
      jest.advanceTimersByTime(1000);
      UpdatedAtHelper.onStateChange(sliceName); // localUpdatedAt = 4000

      // At T=5000, the save operation (initiated before T=4000) completes.
      jest.advanceTimersByTime(1000);
      UpdatedAtHelper.onSave(sliceName); // storedUpdatedAt = 5000, localUpdatedAt remains 4000

      // The state should NOT be saved. The `onSave` call updates the `storedUpdatedAt`
      // to the current time (5000), which is more recent than the last local change (4000).
      // This correctly reflects that the version at T=5000 (or slightly before) is what's in storage.
      expect(await UpdatedAtHelper.shouldSave(sliceName)).toBe(false);
    });
  });
});
