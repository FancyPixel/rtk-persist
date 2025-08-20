import { TestSettings } from '../src/settings';
import { StorageHandler } from '../src/types';
import UpdatedAtHelper from '../src/updatedAtHelper';
import {
  clearPersistedStorage,
  getStorageName,
  getStoredState,
  REHYDRATE,
  writePersistedStorage,
} from '../src/utils';
import { StorageMock } from './mocks';

// Mock the UpdatedAtHelper to isolate its functionality during tests
jest.mock('../src/updatedAtHelper', () => ({
  onSave: jest.fn(),
}));

describe('Utils', () => {
  let storage: StorageHandler;
  const sliceName = 'testSlice';
  const initialState = { value: 10 };

  beforeEach(() => {
    storage = new StorageMock();
    TestSettings.restoreDefaults();
    TestSettings.storageHandler = storage;
    TestSettings.applicationId = 'testApp';
    (UpdatedAtHelper.onSave as jest.Mock).mockClear();
  });

  describe('REHYDRATE action', () => {
    it('should have the correct action type', () => {
      expect(REHYDRATE.type).toBe('@@INIT-PERSIST');
    });
  });

  describe('getStorageName', () => {
    it('should generate the correct storage key', () => {
      const expectedKey = `persist:testApp-${sliceName}`;
      expect(getStorageName(sliceName)).toBe(expectedKey);
    });
  });

  describe('writePersistedStorage', () => {
    it('should write the state to storage and call onSave', async () => {
      await writePersistedStorage({ [sliceName]: initialState }, sliceName);
      const storedValue = await storage.getItem(getStorageName(sliceName));
      expect(storedValue).toBe(JSON.stringify(initialState));
      expect(UpdatedAtHelper.onSave).toHaveBeenCalledWith(sliceName);
    });

    it('should handle storage write errors gracefully', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const errorMessage = 'Failed to write';
      storage.setItem = jest.fn().mockRejectedValue(new Error(errorMessage));

      await writePersistedStorage({ [sliceName]: initialState }, sliceName);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'rtk-persist: Failed to save state.',
        expect.any(Error),
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getStoredState', () => {
    it('should retrieve and parse the stored state', async () => {
      await storage.setItem(
        getStorageName(sliceName),
        JSON.stringify(initialState),
      );
      const retrievedState = await getStoredState(sliceName);
      expect(retrievedState).toEqual(initialState);
    });

    it('should return null if no state is found in storage', async () => {
      const retrievedState = await getStoredState('nonExistentSlice');
      expect(retrievedState).toBeNull();
    });

    it('should handle JSON parsing errors gracefully', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      await storage.setItem(getStorageName(sliceName), 'invalid-json');

      const retrievedState = await getStoredState(sliceName);

      expect(retrievedState).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'rtk-persist: Failed to load or parse stored state.',
        expect.any(Error),
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('clearPersistedStorage', () => {
    it('should remove the specified slice from storage', async () => {
      const storageKey = getStorageName(sliceName);
      await storage.setItem(storageKey, JSON.stringify(initialState));

      await clearPersistedStorage(sliceName);

      const storedValue = await storage.getItem(storageKey);
      expect(storedValue).toBeNull();
    });
  });
});
