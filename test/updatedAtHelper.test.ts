import Settings from '../src/settings';
import UpdatedAtHelper from '../src/updatedAtHelper';
import { mockStorageHandler } from "./mocks";

describe('Updated At helper', () => {
  beforeAll(() => {
    Settings.storageHandler = mockStorageHandler;
  });

  it('should return 0 when a slice has never been updated', async () => {
    expect(await UpdatedAtHelper.getStoredUpdateAtOf('mocked')).toBe(0);
  });

  it('should allow to save when the slice is updated but not saved', async () => {
    UpdatedAtHelper.onStateChange('mocked');
    expect(await UpdatedAtHelper.shouldSave('mocked')).toBeTruthy();
    UpdatedAtHelper.onSave('mocked');
    expect(await UpdatedAtHelper.shouldSave('mocked')).toBeFalsy();
  });
});