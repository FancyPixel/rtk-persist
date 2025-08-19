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
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return 0 for the stored update time of a new slice', async () => {
    // A slice that has never been seen before should have no stored update time.
    expect(await UpdatedAtHelper.getStoredUpdateAtOf('newSlice')).toBe(0);
  });

  it('should correctly track state changes and saves', async () => {
    const sliceName = 'testSlice';

    // 1. Initially, the slice has no updates, so it should not be saved.
    expect(await UpdatedAtHelper.shouldSave(sliceName)).toBe(false);

    // 2. Simulate a state change. The local state is now newer than the stored state.
    UpdatedAtHelper.onStateChange(sliceName);
    expect(await UpdatedAtHelper.shouldSave(sliceName)).toBe(true);

    // 3. Simulate saving the state to storage. The stored state is now up-to-date.
    UpdatedAtHelper.onSave(sliceName);
    expect(await UpdatedAtHelper.shouldSave(sliceName)).toBe(false);
  });

  it('should correctly determine when to override local state', async () => {
    const sliceName = 'overrideSlice';

    // Initially, local state is not older than stored state.
    expect(await UpdatedAtHelper.shouldOverride(sliceName)).toBe(false);

    // Simulate a state change and save, making the stored timestamp > 0.
    UpdatedAtHelper.onStateChange(sliceName);
    UpdatedAtHelper.onSave(sliceName);
    const firstSaveTime = await UpdatedAtHelper.getStoredUpdateAtOf(sliceName);
    expect(firstSaveTime).toBeGreaterThan(0);

    // Now, simulate another local state change, making local newer than stored.
    UpdatedAtHelper.onStateChange(sliceName);
    expect(await UpdatedAtHelper.shouldOverride(sliceName)).toBe(false);

    // Simulate an external update by setting a future timestamp in storage.
    const futureTime = new Date().getTime() + 5000;
    TestUpdatedAtHelper._setStoredUpdatedAtForTest(sliceName, futureTime);

    // Now, the local state is older and should be overridden.
    expect(await UpdatedAtHelper.shouldOverride(sliceName)).toBe(true);
  });
});
