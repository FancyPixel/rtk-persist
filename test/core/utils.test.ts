/**
 * @file Test suite for the utility functions in `utils.ts`.
 * This file covers storage operations, key generation, and the deep
 * object traversal logic used throughout the rtk-persist library.
 */

import { TestSettings } from '../../src/core/settings';
import { StorageHandler } from '../../src/core/types';
import UpdatedAtHelper from '../../src/core/updatedAtHelper';
import {
  clearPersistedStorage,
  deepGetByPath,
  getStorageName,
  getStoredState,
  REHYDRATE,
  writePersistedStorage,
} from '../../src/core/utils';
import { StorageMock } from './mocks';

// Mock the UpdatedAtHelper to isolate its functionality during tests.
jest.mock('../../src/core/updatedAtHelper', () => ({
  onSave: jest.fn(),
}));

describe('Utilities', () => {
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

  describe('REHYDRATE Action', () => {
    it('should have the correct action type string', () => {
      expect(REHYDRATE.type).toBe('@@INIT-PERSIST');
    });
  });

  describe('getStorageName', () => {
    it('should generate a correctly formatted and namespaced storage key', () => {
      const expectedKey = `persist:testApp-${sliceName}`;
      expect(getStorageName(sliceName)).toBe(expectedKey);
    });
  });

  describe('writePersistedStorage', () => {
    it('should write the serialized state to storage and call onSave', async () => {
      await writePersistedStorage(initialState, sliceName);
      const storedValue = await storage.getItem(getStorageName(sliceName));
      expect(storedValue).toBe(JSON.stringify(initialState));
      expect(UpdatedAtHelper.onSave).toHaveBeenCalledWith(sliceName);
    });

    it('should handle storage write errors gracefully without throwing', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const errorMessage = 'Failed to write';
      storage.setItem = jest.fn().mockRejectedValue(new Error(errorMessage));

      await writePersistedStorage(initialState, sliceName);

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getStoredState', () => {
    it('should retrieve and correctly parse the stored state', async () => {
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

    it('should handle JSON parsing errors gracefully and return null', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      await storage.setItem(getStorageName(sliceName), 'invalid-json');

      const retrievedState = await getStoredState(sliceName);

      expect(retrievedState).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('clearPersistedStorage', () => {
    it('should remove the specified slice data from storage', async () => {
      const storageKey = getStorageName(sliceName);
      await storage.setItem(storageKey, JSON.stringify(initialState));

      await clearPersistedStorage(sliceName);

      const storedValue = await storage.getItem(storageKey);
      expect(storedValue).toBeNull();
    });
  });

  describe('deepGetByPath', () => {
    const data = {
      foo: {
        foz: [1, 2, 3],
        bar: { baz: ['a', 'b', 'c'] },
      },
      list: [{ item: 'one' }, { item: 'two' }],
      'with-hyphen': { value: 'hyphenated' },
      'key with space': { value: 'space value' },
      matrix: [
        [1, 2],
        [3, 4],
      ],
      nullValue: null,
      undefinedValue: undefined,
    };

    it('should retrieve a deeply nested value using dot notation', () => {
      expect(deepGetByPath(data, 'foo.bar.baz')).toEqual(['a', 'b', 'c']);
    });

    it('should retrieve a value from an array using bracket notation', () => {
      expect(deepGetByPath(data, 'foo.foz[2]')).toBe(3);
    });

    it('should retrieve a nested value inside an array of objects', () => {
      expect(deepGetByPath(data, 'list[0].item')).toBe('one');
    });

    it('should handle nested array access', () => {
      expect(deepGetByPath(data, 'matrix[1][0]')).toBe(3);
    });

    it('should handle keys with hyphens if quoted', () => {
      expect(deepGetByPath(data, '["with-hyphen"].value')).toBe('hyphenated');
    });

    it('should handle keys with spaces if quoted', () => {
      expect(deepGetByPath(data, "['key with space'].value")).toBe(
        'space value',
      );
    });

    it('should return null for paths that do not exist', () => {
      expect(deepGetByPath(data, 'foo.nonexistent.path')).toBeNull();
    });

    it('should return null for paths that traverse through a null value', () => {
      expect(deepGetByPath(data, 'nullValue.someProp')).toBeNull();
    });

    it('should return null for paths that traverse through an undefined value', () => {
      expect(deepGetByPath(data, 'undefinedValue.someProp')).toBeNull();
    });

    it('should return null when attempting to access properties on a primitive', () => {
      expect(deepGetByPath(data, 'foo.foz[0].length')).toBeNull();
    });

    it('should return the original object for an empty path string', () => {
      expect(deepGetByPath(data, '')).toEqual(data);
    });

    it('should return top-level values correctly', () => {
      expect(deepGetByPath(data, 'nullValue')).toBeNull();
      expect(deepGetByPath(data, 'undefinedValue')).toBeUndefined();
    });

    it('should handle paths starting with a bracket', () => {
      expect(deepGetByPath(data.list, '[1].item')).toBe('two');
    });
  });
});
